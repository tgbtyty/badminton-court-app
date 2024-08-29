import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../config';

function PlayersListPage() {
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedPlayers, setExpandedPlayers] = useState({});

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

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

  const handleSort = (column) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const togglePlayerExpand = (id) => {
    setExpandedPlayers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMarkPlayer = async (id) => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/players/${id}/toggle-mark`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPlayers(prevPlayers => prevPlayers.map(player => 
        player.id === id ? { ...player, is_marked: response.data.is_marked } : player
      ));
    } catch (error) {
      console.error('Error toggling player mark:', error);
    }
  };

  const toggleFlagPlayer = async (id) => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/players/${id}/toggle-flag`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPlayers(prevPlayers => prevPlayers.map(player => 
        player.id === id ? { ...player, is_flagged: response.data.is_flagged } : player
      ));
    } catch (error) {
      console.error('Error toggling player flag:', error);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortColumn === 'is_marked') {
      return (b.is_marked ? 1 : 0) - (a.is_marked ? 1 : 0);
    }
    if (sortColumn === 'is_flagged') {
      return (b.is_flagged ? 1 : 0) - (a.is_flagged ? 1 : 0);
    }
    if (sortColumn) {
      if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredPlayers = sortedPlayers.filter(player => 
    player.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPlayers = filteredPlayers.reduce((acc, player) => {
    const key = player.package_holder_id || player.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(player);
    return acc;
  }, {});

  const SortButton = ({ column, label }) => (
    <button
      onClick={() => handleSort(column)}
      className="font-semibold flex items-center"
    >
      {label}
      {sortColumn === column && (
        <span className="ml-1">
          {sortDirection === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </button>
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  };

  const renderPlayerRow = (player, isGrouped = false, isPackageHolder = false) => (
    <tr key={player.id} className={`border-t ${isGrouped ? 'bg-gray-50' : ''}`}>
      <td className="py-3 px-4">
        <button
          onClick={() => toggleMarkPlayer(player.id)}
          className="text-2xl focus:outline-none"
          style={{
            opacity: player.is_marked ? 1 : 0.3,
            color: player.is_marked ? '#22c55e' : 'inherit',
            transition: 'opacity 0.3s, color 0.3s'
          }}
        >
          ✅
        </button>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => toggleFlagPlayer(player.id)}
          className="text-2xl focus:outline-none"
          style={{
            opacity: player.is_flagged ? 1 : 0.3,
            color: player.is_flagged ? '#ef4444' : 'inherit',
            transition: 'opacity 0.3s, color 0.3s'
          }}
        >
          🚩
        </button>
      </td>
      <td className="py-3 px-4">{player.first_name}</td>
      <td className="py-3 px-4">{player.last_name}</td>
      <td className="py-3 px-4">{player.username}</td>
      <td className="py-3 px-4">{player.temp_password}</td>
      <td className="py-3 px-4">{isPackageHolder ? player.package_uses : ''}</td>
      <td className="py-3 px-4">{formatTime(player.created_at)}</td>
      <td className="py-3 px-4">
        <button
          onClick={() => removePlayer(player.id)}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300 mr-2"
        >
          Remove
        </button>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-3xl font-bold">Players List</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <Link to="/home" className="bg-primary text-white px-6 py-2 rounded hover:bg-green-600 transition duration-300">
            Back to Home
          </Link>
          <div className="text-lg font-semibold">
            Total Players: {players.length}
          </div>
          <button
            onClick={clearAllPlayers}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition duration-300"
          >
            CLEAR ALL PLAYERS
          </button>
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-3 px-4 text-left"><SortButton column="is_marked" label="Mark" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="is_flagged" label="Flag" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="first_name" label="First Name" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="last_name" label="Last Name" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="username" label="Username" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="temp_password" label="Temporary Password" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="package_uses" label="Package Uses" /></th>
                <th className="py-3 px-4 text-left"><SortButton column="created_at" label="Registration Time" /></th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedPlayers).map(([key, group]) => (
                <React.Fragment key={key}>
                  {renderPlayerRow(group[0], false, true)}
                  {group.length > 1 && (
                    <tr>
                      <td colSpan="9" className="py-2 px-4 bg-gray-100">
                        <button
                          onClick={() => togglePlayerExpand(group[0].id)}
                          className="text-blue-500 hover:text-blue-700 flex items-center"
                        >
                          <span className="mr-2">
                            {expandedPlayers[group[0].id] ? '▼' : '►'}
                          </span>
                          Group Members ({group.length - 1})
                        </button>
                      </td>
                    </tr>
                  )}
                  {expandedPlayers[group[0].id] && group.slice(1).map(player => renderPlayerRow(player, true))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default PlayersListPage;