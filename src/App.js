import React, { useState } from 'react';
import PDFViewer from './components/PDFViewer';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (pdfFile) {
    return <PDFViewer file={pdfFile} onClose={() => setPdfFile(null)} />;
  }

  return (
    <div className="upload-screen">
      <div
        className="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <h1>HBS Case Reader</h1>
        <p>Drop your PDF case here or click to upload</p>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          id="file-input"
        />
        <label htmlFor="file-input" className="upload-btn">
          Choose PDF
        </label>
      </div>
    </div>
  );
}

export default App;