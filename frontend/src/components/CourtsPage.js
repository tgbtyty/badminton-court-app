import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [playerCredentials, setPlayerCredentials] = useState([{ username: '', password: '' }]);
  const [queueError, setQueueError] = useState('');
  const [action, setAction] = useState('queue'); // 'queue' or 'remove'

  useEffect(() => {
    fetchCourts();
    const interval = setInterval(fetchCourts, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCourts(prevCourts => prevCourts.map(court => {
        if (court.remaining_time > 0 && court.active_players.length > 0) {
          return { ...court, remaining_time: court.remaining_time - 1 };
        }
        return court;
      }));
    }, 1000);

    return () => clearInterval(timerInterval);
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

  const handleCourtAction = (court, actionType) => {
    setSelectedCourt(court);
    setShowQueueModal(true);
    setPlayerCredentials([{ username: '', password: '' }]);
    setQueueError('');
    setAction(actionType);
  };

  const handleCredentialChange = (index, field, value) => {
    const newCredentials = [...playerCredentials];
    newCredentials[index][field] = value;
    setPlayerCredentials(newCredentials);
  };

  const addPlayerCredential = () => {
    if (playerCredentials.length < 4) {
      setPlayerCredentials([...playerCredentials, { username: '', password: '' }]);
    }
  };

  const removePlayerCredential = (index) => {
    const newCredentials = playerCredentials.filter((_, i) => i !== index);
    setPlayerCredentials(newCredentials);
  };

  const handlePlayerAction = async () => {
    try {
      const endpoint = action === 'queue' ? 'queue' : 'remove';
      await axios.post(`${config.apiBaseUrl}/courts/${selectedCourt.id}/${endpoint}`, {
        playerCredentials: playerCredentials
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowQueueModal(false);
      fetchCourts();
    } catch (error) {
      console.error(`Error ${action}ing players:`, error);
      setQueueError(error.response?.data?.message || `Error ${action}ing players. Please try again.`);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-3xl font-bold">Courts</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(court => (
            <div 
              key={court.id} 
              className="bg-white p-4 rounded shadow hover:shadow-lg transition duration-300"
            >
              <h3 className="text-xl font-bold mb-2">{court.name}</h3>
              <p className="mb-2">
                Timer: {court.remaining_time && court.active_players.length > 0
                  ? formatTime(court.remaining_time)
                  : 'Not started'}
              </p>
              <div className="mb-2">
                <h4 className="font-semibold">Active Players ({court.active_players.length}/4):</h4>
                <ul>
                  {court.active_players.map((player, index) => (
                    <li key={index}>{player.first_name} {player.last_name}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-2">
                <h4 className="font-semibold">Queued Groups:</h4>
                {court.waiting_groups.map((group, groupIndex) => (
                  <div key={groupIndex} className="ml-2 mb-1">
                    <span className="font-medium">Group {groupIndex + 1}:</span>
                    <ul className="list-disc list-inside">
                      {group.map((player, playerIndex) => (
                        <li key={playerIndex}>{player.first_name} {player.last_name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCourtAction(court, 'queue')}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300 mr-2"
              >
                Queue for This Court
              </button>
              <button
                onClick={() => handleCourtAction(court, 'remove')}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-300"
              >
                Remove from Court/Queue
              </button>
            </div>
          ))}
        </div>
      </main>

      {showQueueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {action === 'queue' ? `Queue for ${selectedCourt.name}` : `Remove from ${selectedCourt.name}`}
            </h2>
            {playerCredentials.map((cred, index) => (
              <div key={index} className="mb-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={cred.username}
                  onChange={(e) => handleCredentialChange(index, 'username', e.target.value)}
                  className="p-2 border rounded w-full mb-2"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={cred.password}
                  onChange={(e) => handleCredentialChange(index, 'password', e.target.value)}
                  className="p-2 border rounded w-full mb-2"
                />
                {index > 0 && (
                  <button
                    onClick={() => removePlayerCredential(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {action === 'queue' && playerCredentials.length < 4 && (
              <button
                onClick={addPlayerCredential}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded mb-4"
              >
                Add Player
              </button>
            )}
            {queueError && <p className="text-red-500 mb-4">{queueError}</p>}
            <div className="flex justify-end">
              <button
                onClick={() => setShowQueueModal(false)}
                className="bg-gray-300 text-black px-4 py-2 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handlePlayerAction}
                className="bg-primary text-white px-4 py-2 rounded"
              >
                {action === 'queue' ? 'Queue' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourtsPage;