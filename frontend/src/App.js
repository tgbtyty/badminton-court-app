import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import HomePage from './components/HomePage';
import PlayerRegister from './components/PlayerRegister';
import PlayersListPage from './components/PlayersListPage';
import PrivateRoute from './components/PrivateRoute';
import './index.css';

function App() {
  useEffect(() => {
    const savedColor = localStorage.getItem('themeColor') || '#62de89';
    document.documentElement.style.setProperty('--color-primary', savedColor);
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/player-register" element={<PlayerRegister />} />
          <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/players-list" element={<PrivateRoute><PlayersListPage /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;