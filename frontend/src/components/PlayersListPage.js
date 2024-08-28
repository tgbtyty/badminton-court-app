import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../config';

function PlayersListPage() {
  const [players, setPlayers] = useState([]);

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

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const clearAllPlayers = async () => {
    if (window.confirm('Are you sure you want to clear all players? This action cannot be undone.')) {
      try {
        await axios.delete(`${config.apiBaseUrl}/players`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPlayers([]);
      } catch (error) {
        console.error('Error clearing all players:', error);
      }
    }
  };

  const removePlayer = async (id) => {
    if (window.confirm('Are you sure you want to remove this player?')) {
      try {
        await axios.delete(`${config.apiBaseUrl}/players/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPlayers(players.filter(player => player.id !== id));
      } catch (error) {
        console.error('Error removing player:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-3xl font-bold">Players List</h1>
      </header>
      <main className="container mx-auto p-4">
        <Link to="/home" className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300 inline-block mb-6">
          Back to Home
        </Link>
        <button
          onClick={clearAllPlayers}
          className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition duration-300 float-right"
        >
          CLEAR ALL PLAYERS
        </button>
        <div className="bg-white shadow-md rounded-lg overflow-hidden mt-6">
          <table className="min-w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">First Name</th>
                <th className="py-3 px-4 text-left font-semibold">Last Name</th>
                <th className="py-3 px-4 text-left font-semibold">Username</th>
                <th className="py-3 px-4 text-left font-semibold">Temporary Password</th>
                <th className="py-3 px-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id} className="border-t">
                  <td className="py-3 px-4">{player.first_name}</td>
                  <td className="py-3 px-4">{player.last_name}</td>
                  <td className="py-3 px-4">{player.username}</td>
                  <td className="py-3 px-4">{player.temp_password}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default PlayersListPage;
