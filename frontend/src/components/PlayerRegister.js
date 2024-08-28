import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';

function PlayerRegister() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const clearResult = useCallback(() => {
    setRegistrationResult(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    let timer;
    if (showResult) {
      timer = setTimeout(() => {
        clearResult();
      }, 5000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showResult, clearResult]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-player`, { firstName, lastName });
      setRegistrationResult(response.data);
      setShowResult(true);
      setFirstName('');
      setLastName('');
    } catch (error) {
      console.error('Player registration error', error);
      alert('Player registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Player Check-In</h2>
        {!showResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
            <p className="mb-2"><span className="font-semibold">Username:</span> {registrationResult.username}</p>
            <p className="mb-4"><span className="font-semibold">Temporary Password:</span> {registrationResult.tempPassword}</p>
            <button
              onClick={clearResult}
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-green-600 transition duration-300"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerRegister;
