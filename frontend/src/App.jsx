import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./components/Homepage";
import ScoreChecker from "./components/ScoreChecker";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/analyze" element={<ScoreChecker />} />
      </Routes>
    </Router>
  );
}

export default App;
