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
}

const EffortEstimator: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);

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
        developerExperience: row["Developer Experience"] || "",
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

  return (
    <div className="effort-estimator">
      <h1 className="title">AI-Powered Agile Effort Estimation</h1>
      <div className="upload-section">
        <input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} />
      </div>
      {stories.length > 0 && (
        <table className="story-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Developer Experience</th>
              <th>Team Sequence</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EffortEstimator;
