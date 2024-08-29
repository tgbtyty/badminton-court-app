import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../config';

function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  useEffect(() => {
    fetchCourts();
    fetchPlayers();
    const interval = setInterval(fetchCourts, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCourts = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/courts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCourts(response.data);
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/players`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPlayers(response.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handlePlayerSelect = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const handleQueuePlayers = async () => {
    if (!selectedCourt || selectedPlayers.length === 0) return;

    try {
      await axios.post(`${config.apiBaseUrl}/courts/${selectedCourt}/queue`, {
        playerIds: selectedPlayers
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedPlayers([]);
      fetchCourts();
    } catch (error) {
      console.error('Error queueing players:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-3xl font-bold">Courts</h1>
      </header>
      <main className="container mx-auto p-4">
        <Link to="/home" className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 mb-4 inline-block">
          Back to Home
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-4">Courts</h2>
            {courts.map(court => (
              <div 
                key={court.id} 
                className={`p-4 mb-4 border rounded ${selectedCourt === court.id ? 'bg-primary text-white' : 'bg-white'}`}
                onClick={() => setSelectedCourt(court.id)}
              >
                <h3 className="text-xl font-bold">{court.name}</h3>
                <p>Current Players: {court.current_players ? court.current_players.length : 0}/4</p>
                <p>Queue: {court.queue ? court.queue.length : 0}</p>
                {court.timer && <p>Time Remaining: {court.timer}</p>}
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Players</h2>
            {players.map(player => (
              <div 
                key={player.id} 
                className={`p-2 mb-2 border rounded cursor-pointer ${selectedPlayers.includes(player.id) ? 'bg-primary text-white' : 'bg-white'}`}
                onClick={() => handlePlayerSelect(player.id)}
              >
                {player.first_name} {player.last_name}
              </div>
            ))}
            <button 
              onClick={handleQueuePlayers}
              className="mt-4 bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300"
              disabled={!selectedCourt || selectedPlayers.length === 0}
            >
              Queue Selected Players
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CourtsPage;