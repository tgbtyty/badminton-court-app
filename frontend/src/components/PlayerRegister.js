import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';

function PlayerRegister() {
  const [players, setPlayers] = useState([{ firstName: '', lastName: '' }]);
  const [useDropInPackage, setUseDropInPackage] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!useDropInPackage) {
      setShowWarning(true);
    } else {
      await registerPlayers();
    }
  };

  const registerPlayers = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-players`, { 
        players,
        useDropInPackage,
        packageUses: useDropInPackage ? 1 : 0
      });
      setRegistrationResult(response.data);
      setShowResult(true);
    } catch (error) {
      console.error('Player registration error', error);
      alert('Player registration failed. Please try again.');
    }
  };

  const handlePlayerChange = (index, field, value) => {
    const updatedPlayers = [...players];
    updatedPlayers[index][field] = value;
    setPlayers(updatedPlayers);
  };

  const confirmRegistration = async () => {
    setShowWarning(false);
    await registerPlayers();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Player Check-In</h2>
        {!showResult ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {players.map((player, index) => (
              <div key={index} className="space-y-4">
                <input
                  type="text"
                  placeholder={`Player ${index + 1} First Name`}
                  value={player.firstName}
                  onChange={(e) => handlePlayerChange(index, 'firstName', e.target.value)}
                  required
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder={`Player ${index + 1} Last Name`}
                  value={player.lastName}
                  onChange={(e) => handlePlayerChange(index, 'lastName', e.target.value)}
                  required
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
            <div 
              className="flex items-center p-4 rounded-md hover:bg-gray-100 cursor-pointer text-lg"
              onClick={() => setUseDropInPackage(!useDropInPackage)}
            >
              <div className={`w-8 h-8 mr-3 border-2 rounded flex items-center justify-center ${useDropInPackage ? 'bg-primary border-primary' : 'border-gray-400'}`}>
                {useDropInPackage && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <span className="text-xl">DROP-IN PACKAGE</span>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300"
            >
              Check In
            </button>
          </form>
        ) : (
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Registration Successful!</h3>
            {registrationResult.players.map((player, index) => (
              <div key={index} className="mb-4">
                <p className="mb-2"><span className="font-semibold">Player {index + 1}:</span></p>
                <p className="mb-1"><span className="font-semibold">Username:</span> {player.username}</p>
                <p className="mb-1"><span className="font-semibold">Temporary Password:</span> {player.tempPassword}</p>
              </div>
            ))}
            <button
              onClick={() => {
                setShowResult(false);
                setPlayers([{ firstName: '', lastName: '' }]);
                setUseDropInPackage(false);
              }}
              className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300"
            >
              Register More Players
            </button>
          </div>
        )}
      </div>
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-red-600">Warning</h3>
            <p className="text-lg mb-6">PLEASE CONFIRM WITH FRONT DESK THAT YOU DO NOT HAVE A PACKAGE</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegistration}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerRegister;