import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../config';

function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [queueForm, setQueueForm] = useState([{ username: '', password: '' }]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourts();
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
      setError('Failed to fetch courts. Please try again.');
    }
  };

  const handleCourtSelect = (court) => {
    setSelectedCourt(court);
    setQueueForm([{ username: '', password: '' }]);
    setError('');
  };

  const handleFormChange = (index, event) => {
    const values = [...queueForm];
    values[index][event.target.name] = event.target.value;
    setQueueForm(values);
  };

  const handleAddPlayer = () => {
    if (queueForm.length < 4) {
      setQueueForm([...queueForm, { username: '', password: '' }]);
    }
  };

  const handleRemovePlayer = (index) => {
    const values = [...queueForm];
    values.splice(index, 1);
    setQueueForm(values);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`${config.apiBaseUrl}/courts/${selectedCourt.id}/queue`, {
        players: queueForm
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Queue response:', response.data);
      setSelectedCourt(null);
      fetchCourts();
    } catch (error) {
      console.error('Error queueing players:', error);
      setError(error.response?.data?.message || 'Failed to queue players. Please try again.');
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
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(court => (
            <div 
              key={court.id} 
              className="bg-white shadow-md rounded-lg p-4 cursor-pointer"
              onClick={() => handleCourtSelect(court)}
            >
              <h3 className="text-xl font-bold mb-2">{court.name}</h3>
              <p>Current Players: {court.current_players?.length || 0}/4</p>
              <p>Queue: {court.queue?.length || 0}</p>
              {court.timer_start && <p>Time Remaining: {court.remaining_time} minutes</p>}
            </div>
          ))}
        </div>
        {selectedCourt && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedCourt.name}</h3>
                <form onSubmit={handleSubmit} className="mt-2 px-7 py-3">
                  {queueForm.map((player, index) => (
                    <div key={index} className="mb-4">
                      <input
                        type="text"
                        name="username"
                        value={player.username}
                        onChange={(e) => handleFormChange(index, e)}
                        placeholder="Username"
                        className="w-full px-3 py-2 border rounded mb-2"
                        required
                      />
                      <input
                        type="password"
                        name="password"
                        value={player.password}
                        onChange={(e) => handleFormChange(index, e)}
                        placeholder="Password"
                        className="w-full px-3 py-2 border rounded"
                        required
                      />
                      {index > 0 && (
                        <button type="button" onClick={() => handleRemovePlayer(index)} className="mt-2 text-red-500">
                          Remove Player
                        </button>
                      )}
                    </div>
                  ))}
                  {queueForm.length < 4 && (
                    <button type="button" onClick={handleAddPlayer} className="mt-2 text-blue-500">
                      Add Player
                    </button>
                  )}
                  <div className="items-center px-4 py-3">
                    <button
                      id="ok-btn"
                      className="px-4 py-2 bg-primary text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                    >
                      Queue
                    </button>
                  </div>
                </form>
                <button onClick={() => setSelectedCourt(null)} className="mt-3 text-gray-600">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CourtsPage;