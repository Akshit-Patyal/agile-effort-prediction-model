import React, { useState } from "react";
import * as XLSX from "xlsx";
import "./Dashboard.scss";

interface Story {
  // id is now a string (may be index-based string or DB UUID returned by backend)
  id: string;
  external_id?: string | null;
  title: string;
  description: string;
  developerExperience: string;
  teamSequence: string;
  [key: string]: any;
  // new fields for parsed estimates from backend
  estimated_hours?: number | null;
  confidence?: string | null;
  raw?: string | null;
  // keep legacy `estimate` for backward-compat if needed (optional)
  estimate?: string;
}

const EffortEstimator: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // parse rows; use strings for id and external_id (if Excel has an ID column)
      const parsedStories: Story[] = jsonData.map((row, index) => {
        const extId =
          row["ID"] ??
          row["Id"] ??
          row["External ID"] ??
          row["external_id"] ??
          null;
        return {
          id: extId ? String(extId) : String(index + 1), // keep a stable string id if no external id
          external_id: extId ? String(extId) : null,
          title: row["Title"] || "",
          description: row["Description"] || "",
          developerExperience: row["Developer Experience"] || "Mid",
          teamSequence: row["Team Sequence"] || "",
        };
      });

      setStories(parsedStories);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInputChange = (
    index: number,
    field: keyof Story,
    value: string
  ) => {
    const updatedStories = [...stories];
    updatedStories[index][field] = value;
    setStories(updatedStories);
  };

  const handleSubmit = async () => {
    setError(null);
    if (stories.length === 0) {
      setError("No stories to estimate.");
      return;
    }

    setLoading(true);
    try {
      // Prepare payload (send external_id if present so server can map)
      const payloadStories = stories.map((s) => ({
        id: s.id,
        external_id: s.external_id ?? null,
        title: s.title,
        description: s.description,
        developer_experience: s.developerExperience,
        team_sequence: s.teamSequence,
      }));

      const response = await fetch("http://localhost:3001/api/v1/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stories: payloadStories }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      const data = await response.json();

      // If backend returns { stories: [...], estimates: [...] }, handle that shape:
      if (
        data &&
        Array.isArray(data.stories) &&
        Array.isArray(data.estimates)
      ) {
        const serverStories: any[] = data.stories;
        const serverEstimates: any[] = data.estimates;

        // Map server stories by external_id and by id
        const byExternal = new Map<string, any>();
        const byId = new Map<string, any>();
        for (const ss of serverStories) {
          if (ss.external_id != null)
            byExternal.set(String(ss.external_id), ss);
          if (ss.id != null) byId.set(String(ss.id), ss);
        }

        // Map estimates by story_id
        const estimateByStoryId = new Map<string, any>();
        for (const est of serverEstimates) {
          if (est.story_id != null)
            estimateByStoryId.set(String(est.story_id), est);
        }

        // Build updated stories
        const updated = stories.map((s) => {
          // Try matching: external_id -> serverStory -> estimate
          let matchedServerStory = null;
          if (s.external_id)
            matchedServerStory = byExternal.get(String(s.external_id));
          // fallback: try matching by title (case-insensitive)
          if (!matchedServerStory) {
            matchedServerStory = serverStories.find(
              (ss) =>
                ss.title &&
                s.title &&
                ss.title.trim().toLowerCase() === s.title.trim().toLowerCase()
            );
          }
          // final fallback: try to match by original frontend id (if server returned it)
          if (!matchedServerStory) {
            matchedServerStory = byId.get(String(s.id));
          }

          let est = null;
          if (matchedServerStory && matchedServerStory.id) {
            est = estimateByStoryId.get(String(matchedServerStory.id)) ?? null;
          }

          if (est) {
            return {
              ...s,
              estimated_hours:
                est.estimated_hours !== undefined &&
                est.estimated_hours !== null
                  ? Number(est.estimated_hours)
                  : null,
              confidence: est.confidence ?? null,
              raw: est.raw ?? null,
              estimate:
                est.estimated_hours !== undefined &&
                est.estimated_hours !== null
                  ? String(est.estimated_hours)
                  : s.estimate,
            };
          }

          // No matching estimate — set nulls
          return {
            ...s,
            estimated_hours: null,
            confidence: null,
            raw: null,
          };
        });

        setStories(updated);
      } else {
        // old behavior: data may have an array of estimates directly
        const estimatesArr: any[] = Array.isArray(data?.estimates)
          ? data.estimates
          : [];
        const estimatesMap = new Map<string, any>();
        for (const e of estimatesArr) {
          if (e && e.id !== undefined && e.id !== null) {
            estimatesMap.set(String(e.id), e);
          } else if (e && e.story_id !== undefined && e.story_id !== null) {
            estimatesMap.set(String(e.story_id), e);
          }
        }

        const updated = stories.map((s) => {
          const found =
            estimatesMap.get(String(s.external_id)) ??
            estimatesMap.get(String(s.id));
          if (found) {
            const hours =
              found.estimated_hours != null
                ? Number(found.estimated_hours)
                : null;
            return {
              ...s,
              estimated_hours: hours,
              confidence: found.confidence ?? null,
              raw: found.raw ?? null,
              estimate: hours !== null ? String(hours) : s.estimate,
            };
          }
          return { ...s, estimated_hours: null, confidence: null, raw: null };
        });

        setStories(updated);
      }
    } catch (err: any) {
      console.error("Error fetching estimates", err);
      setError(err?.message ?? "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mainContainer">
      <h1 className="title">AI-Powered Agile Effort Estimation</h1>
      <div className="uploadSection">
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileUpload}
          className="uploadBtn"
        />
      </div>

      {error && <div className="errorBox">{error}</div>}

      {stories.length > 0 && (
        <div>
          <table className="tableContainer">
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Title</th>
                <th>Description</th>
                <th>Developer Experience</th>
                <th>Team Sequence</th>
                <th>Effort Estimate (hrs)</th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story, index) => (
                <tr key={story.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={story.title}
                      onChange={(e: { target: { value: string } }) =>
                        handleInputChange(index, "title", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={story.description}
                      onChange={(e: { target: { value: string } }) =>
                        handleInputChange(index, "description", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={story.developerExperience}
                      onChange={(e: { target: { value: string } }) =>
                        handleInputChange(
                          index,
                          "developerExperience",
                          e.target.value
                        )
                      }
                    >
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={story.teamSequence}
                      onChange={(e: { target: { value: string } }) =>
                        handleInputChange(index, "teamSequence", e.target.value)
                      }
                      placeholder="e.g., BA -> Integration -> Dev -> QA"
                    />
                  </td>

                  {/* render primitive estimated value - avoids React object error */}
                  <td>
                    {story.estimated_hours !== undefined &&
                    story.estimated_hours !== null
                      ? story.estimated_hours
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={loading}
          >
            {loading ? "Estimating..." : "Submit for Estimation"}
          </button>
        </div>
      )}
    </div>
  );
};

export default EffortEstimator;
