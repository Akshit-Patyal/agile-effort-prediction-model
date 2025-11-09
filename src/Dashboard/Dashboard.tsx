import React, { useState } from "react";
import * as XLSX from "xlsx";
import "./Dashboard.scss";

interface Story {
  id: number;
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
      const parsedStories: Story[] = jsonData.map((row, index) => ({
        id: index + 1,
        title: row["Title"] || "",
        description: row["Description"] || "",
        developerExperience: row["Developer Experience"] || "Mid",
        teamSequence: row["Team Sequence"] || "",
      }));
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
      const response = await fetch("http://localhost:3001/api/v1/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stories: stories }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      const data = await response.json();

      // Expecting data.estimates to be an array of objects like:
      // { id, title, estimated_hours, confidence, raw }
      const estimatesArr: any[] = Array.isArray(data?.estimates)
        ? data.estimates
        : [];

      // Build a map by id for quick lookup
      const estimatesMap = new Map<number | string, any>();
      for (const e of estimatesArr) {
        if (e && e.id !== undefined) {
          estimatesMap.set(Number(e.id), e);
          estimatesMap.set(String(e.id), e);
        }
      }

      // Align and update stories by id (not by index)
      const updated = stories.map((s) => {
        const found =
          estimatesMap.get(s.id) ?? estimatesMap.get(String(s.id)) ?? null;
        if (found) {
          return {
            ...s,
            estimated_hours:
              found.estimated_hours !== undefined
                ? Number(found.estimated_hours)
                : null,
            confidence: found.confidence ?? null,
            raw: found.raw ?? null,
            // optional backward-compatible field:
            estimate:
              found.estimated_hours !== undefined
                ? String(found.estimated_hours)
                : s.estimate,
          };
        }
        return {
          ...s,
          estimated_hours: null,
          confidence: null,
          raw: null,
        };
      });

      setStories(updated);
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
        <input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} />
      </div>

      {error && <div className="errorBox">{error}</div>}

      {stories.length > 0 && (
        <div>
          <table className="tableContainer">
            <thead>
              <tr>
                <th>ID</th>
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
                  <td>{story.id}</td>
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
                    {story.estimated_hours !== undefined && story.estimated_hours !== null
                      ? story.estimated_hours
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSubmit} className="submit-btn" disabled={loading}>
            {loading ? "Estimating..." : "Submit for Estimation"}
          </button>
        </div>
      )}
    </div>
  );
};

export default EffortEstimator;
