import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../config';

function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [playerCredentials, setPlayerCredentials] = useState([]);

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

  const handleCourtSelect = (court) => {
    setSelectedCourt(court);
    setShowQueueModal(true);
    setSelectedPlayers([]);
    setPlayerCredentials([]);
  };

  const handlePlayerSelect = (player) => {
    if (selectedPlayers.includes(player.id)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
      setPlayerCredentials(playerCredentials.filter(cred => cred.id !== player.id));
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers([...selectedPlayers, player.id]);
      setPlayerCredentials([...playerCredentials, { id: player.id, username: player.username, password: '' }]);
    }
  };

  const handleCredentialChange = (id, field, value) => {
    setPlayerCredentials(playerCredentials.map(cred => 
      cred.id === id ? { ...cred, [field]: value } : cred
    ));
  };

  const handleQueuePlayers = async () => {
    try {
      await axios.post(`${config.apiBaseUrl}/courts/${selectedCourt.id}/queue`, {
        playerCredentials: playerCredentials
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowQueueModal(false);
      fetchCourts();
    } catch (error) {
      console.error('Error queueing players:', error);
      alert('Error queueing players. Please try again.');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(court => (
            <div 
              key={court.id} 
              className="bg-white p-4 rounded shadow cursor-pointer hover:shadow-lg transition duration-300"
              onClick={() => handleCourtSelect(court)}
            >
              <h3 className="text-xl font-bold mb-2">{court.name}</h3>
              <p className="mb-2">Current Players: {court.current_players ? court.current_players.length : 0}/4</p>
              <p>Queue: {court.queue ? court.queue.length : 0} groups</p>
            </div>
          ))}
        </div>
      </main>

      {showQueueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Queue for {selectedCourt.name}</h2>
            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-2">Select Players (up to 4):</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {players.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    className={`p-2 rounded ${selectedPlayers.includes(player.id) ? 'bg-primary text-white' : 'bg-gray-200'}`}
                  >
                    {player.first_name} {player.last_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-2">Enter Credentials:</h3>
              {playerCredentials.map(cred => (
                <div key={cred.id} className="mb-2">
                  <input
                    type="text"
                    placeholder="Username"
                    value={cred.username}
                    onChange={(e) => handleCredentialChange(cred.id, 'username', e.target.value)}
                    className="p-2 border rounded mr-2"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={cred.password}
                    onChange={(e) => handleCredentialChange(cred.id, 'password', e.target.value)}
                    className="p-2 border rounded"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowQueueModal(false)}
                className="bg-gray-300 text-black px-4 py-2 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleQueuePlayers}
                className="bg-primary text-white px-4 py-2 rounded"
                disabled={playerCredentials.length === 0}
              >
                Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourtsPage;