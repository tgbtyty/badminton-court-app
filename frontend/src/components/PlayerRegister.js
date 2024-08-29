import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';

function PlayerRegister() {
  const [players, setPlayers] = useState([{ firstName: '', lastName: '' }]);
  const [useDropInPackage, setUseDropInPackage] = useState(false);
  const [packageUses, setPackageUses] = useState(1);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await registerPlayers();
  };

  const registerPlayers = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-players`, { 
        players,
        useDropInPackage,
        packageUses: useDropInPackage ? packageUses : 0
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

  const handlePackageUsesChange = (value) => {
    const newPackageUses = Math.max(1, Math.min(4, value));
    setPackageUses(newPackageUses);
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      while (newPlayers.length < newPackageUses) {
        newPlayers.push({ firstName: '', lastName: '' });
      }
      return newPlayers.slice(0, newPackageUses);
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Player Check-In</h2>
        {!showResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {players.map((player, index) => (
              <div key={index}>
                <input
                  type="text"
                  placeholder={`Player ${index + 1} First Name`}
                  value={player.firstName}
                  onChange={(e) => handlePlayerChange(index, 'firstName', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder={`Player ${index + 1} Last Name`}
                  value={player.lastName}
                  onChange={(e) => handlePlayerChange(index, 'lastName', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                />
              </div>
            ))}
            <div 
              className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer"
              onClick={() => setUseDropInPackage(!useDropInPackage)}
            >
              <div className={`w-6 h-6 mr-2 border-2 rounded flex items-center justify-center ${useDropInPackage ? 'bg-primary border-primary' : 'border-gray-400'}`}>
                {useDropInPackage && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <span className="text-lg">Do you have a drop-in package?</span>
            </div>
            {useDropInPackage && (
              <div className="flex items-center justify-between">
                <span className="text-lg">Number of package uses:</span>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handlePackageUsesChange(packageUses - 1)}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-l"
                  >
                    -
                  </button>
                  <span className="bg-gray-100 px-4 py-1">{packageUses}</span>
                  <button
                    type="button"
                    onClick={() => handlePackageUsesChange(packageUses + 1)}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-r"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
            >
              Check In
            </button>
          </form>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Registration Successful!</h3>
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
                setPackageUses(1);
              }}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
            >
              Register More Players
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerRegister;