import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import AudioPlayer from './AudioPlayer';
import Toolbar from './Toolbar';
import './PDFViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function PDFViewer({ file, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [pdfText, setPdfText] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [mode, setMode] = useState('annotate');
  const [activeTool, setActiveTool] = useState('highlight');
  const [activeColor, setActiveColor] = useState('#FFFF00');
  const [opacity, setOpacity] = useState(0.4);
  const pdfRef = useRef(null);
  const hasLoaded = useRef(false);
  const highlightHistoryRef = useRef([]);
  const activeColorRef = useRef(activeColor);
  const opacityRef = useRef(opacity);

  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadPDF();
  }, []);

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  async function loadPDF() {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pdfRef.current = pdf;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + ' ';
    }

    setPdfText(fullText);
    setNumPages(pdf.numPages);
  }

  useEffect(() => {
    if (numPages === 0 || !pdfRef.current) return;
    renderAllPages();
  }, [numPages]);

  async function renderAllPages() {
    const pdf = pdfRef.current;
    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(pdf, i);
    }
  }

  async function renderPage(pdf, pageNum) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const pageContainer = document.getElementById(`page-container-${pageNum}`);
    if (!pageContainer) return;
    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;
    pageContainer.style.position = 'relative';

    const canvas = document.getElementById(`pdf-canvas-${pageNum}`);
    if (!canvas) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const textLayerDiv = document.getElementById(`text-layer-${pageNum}`);
    if (!textLayerDiv) return;
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    textLayerDiv.style.position = 'absolute';
    textLayerDiv.style.top = '0';
    textLayerDiv.style.left = '0';

    const textContent = await page.getTextContent();

    textContent.items.forEach((item) => {
      const tx = pdfjsLib.Util.transform(
        pdfjsLib.Util.transform(viewport.transform, item.transform),
        [1, 0, 0, -1, 0, 0]
      );
      const fontSize = Math.abs(tx[0]);
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.left = `${tx[4]}px`;
      span.style.top = `${tx[5] - fontSize}px`;
      span.style.fontSize = `${fontSize}px`;
      span.style.lineHeight = `${fontSize}px`;
      span.style.color = 'transparent';
      span.style.cursor = 'text';
      span.style.whiteSpace = 'pre';
      span.style.userSelect = 'text';
      textLayerDiv.appendChild(span);
    });

    textLayerDiv.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const spans = textLayerDiv.querySelectorAll('span');
      const highlightedSpans = [];

      spans.forEach(span => {
        if (selection.containsNode(span, true)) {
          const previousColor = span.style.backgroundColor || '';
          const currentOpacity = span.dataset.highlightOpacity ? parseFloat(span.dataset.highlightOpacity) : 0;
          const newOpacity = Math.min(1, currentOpacity + opacityRef.current);
          const newRgba = hexToRgba(activeColorRef.current, newOpacity);
          span.style.backgroundColor = newRgba;
          span.dataset.highlightOpacity = newOpacity;
          highlightedSpans.push({ span, previousColor, previousOpacity: currentOpacity });
          span.dataset.highlighted = 'true';
        }
      });

      if (highlightedSpans.length > 0) {
        highlightHistoryRef.current.push(highlightedSpans);
      }

      selection.removeAllRanges();
    });
  }

  const handleUndo = () => {
    const history = highlightHistoryRef.current;
    if (history.length === 0) return;
    const lastHighlight = history.pop();
    lastHighlight.forEach(({ span, previousColor, previousOpacity }) => {
      span.style.backgroundColor = previousColor;
      span.dataset.highlightOpacity = previousOpacity || 0;
    });
  };

  const handleClear = () => {
    document.querySelectorAll('[data-highlighted="true"]').forEach(span => {
      span.style.backgroundColor = '';
      span.dataset.highlighted = 'false';
      span.dataset.highlightOpacity = 0;
    });
    highlightHistoryRef.current = [];
  };

const generateAudio = async () => {
    if (audioUrl) return;
    setIsGeneratingAudio(true);
    try {
      const truncatedText = pdfText.slice(0, 15000);
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.REACT_APP_ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs error:', errorText);
        setIsGeneratingAudio(false);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      console.error('Audio generation failed:', err);
    }
    setIsGeneratingAudio(false);
  };

  return (
    <div className="pdf-viewer">
      <div className="top-bar">
        <button onClick={onClose} className="back-btn">← Back</button>
        <span>{file.name}</span>
        <div className="mode-toggle">
          <button
            className={mode === 'annotate' ? 'active' : ''}
            onClick={() => setMode('annotate')}
          >Annotate</button>
          <button
            className={mode === 'listen' ? 'active' : ''}
            onClick={() => setMode('listen')}
          >Listen</button>
        </div>
        <button onClick={generateAudio} disabled={isGeneratingAudio || !!audioUrl}>
          {isGeneratingAudio ? 'Generating Audio...' : audioUrl ? 'Audio Ready' : 'Generate Audio'}
        </button>
        <button onClick={handleUndo} className="undo-btn">↩ Undo</button>
        <button onClick={handleClear} className="undo-btn">🗑 Clear All</button>
      </div>

      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        opacity={opacity}
        setOpacity={setOpacity}
      />

      <div className="pdf-content">
        <div className="pages-container">
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} id={`page-container-${i + 1}`} className="page-wrapper">
              <canvas id={`pdf-canvas-${i + 1}`} className="pdf-page" />
              <div id={`text-layer-${i + 1}`} className="textLayer" />
            </div>
          ))}
        </div>
      </div>

      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
    </div>
  );
}

export default PDFViewer;