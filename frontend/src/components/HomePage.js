import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function HomePage() {
  const [courts, setCourts] = useState([]);
  const [showLockModal, setShowLockModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [lockStartTime, setLockStartTime] = useState('');
  const [lockDuration, setLockDuration] = useState('');

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const response = await axios.get('${config.apiBaseUrl}/courts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCourts(response.data);
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  };

  const addCourt = async () => {
    try {
      await axios.post('${config.apiBaseUrl}/courts', { name: `Court ${courts.length + 1}` }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchCourts();
    } catch (error) {
      console.error('Error adding court:', error);
    }
  };

  const removeCourt = async () => {
    if (courts.length > 0) {
      try {
        await axios.delete(`${config.apiBaseUrl}/courts/${courts[courts.length - 1].id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchCourts();
      } catch (error) {
        console.error('Error removing court:', error);
      }
    }
  };

  const openLockModal = (court) => {
    setSelectedCourt(court);
    setShowLockModal(true);
  };

  const lockCourt = async () => {
    try {
      const [hours, minutes] = lockDuration.split(':').map(Number);
      const durationInMinutes = hours * 60 + minutes;
      await axios.post(`${config.apiBaseUrl}/api/courts/${selectedCourt.id}/lock`, {
        startTime: lockStartTime,
        duration: durationInMinutes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowLockModal(false);
      fetchCourts();
    } catch (error) {
      console.error('Error locking court:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-3xl font-bold">Badminton Court Management</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Courts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map(court => (
              <div key={court.id} className="bg-white shadow-md rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">{court.name}</h3>
                <p className="mb-2">Status: <span className={`font-semibold ${court.is_locked ? 'text-red-500' : 'text-green-500'}`}>
                  {court.is_locked ? 'Locked' : 'Available'}
                </span></p>
                <button
                  onClick={() => openLockModal(court)}
                  className="bg-primary text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300"
                >
                  Lock Court
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex space-x-4 mb-8">
          <button
            onClick={addCourt}
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300"
          >
            Add Court
          </button>
          <button
            onClick={removeCourt}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition duration-300"
          >
            Remove Court
          </button>
        </div>
        <div className="flex flex-col space-y-4">
          <Link
            to="/player-register"
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 text-center"
            onClick={() => {
              if (!window.confirm('Warning: This action is permanent. Are you sure you want to proceed to the player registration page?')) {
                return false;
              }
            }}
          >
            Player Registration Page
          </Link>
          <Link
            to="/players-list"
            className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 text-center"
          >
            Players List
          </Link>
        </div>
      </main>
      {showLockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Lock Court</h2>
            <input
              type="time"
              value={lockStartTime}
              onChange={(e) => setLockStartTime(e.target.value)}
              className="block w-full mb-4 p-2 border rounded"
            />
            <input
              type="time"
              value={lockDuration}
              onChange={(e) => setLockDuration(e.target.value)}
              className="block w-full mb-4 p-2 border rounded"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
              >
                Cancel
              </button>
              <button
                onClick={lockCourt}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
