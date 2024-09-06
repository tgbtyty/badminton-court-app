import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import config from '../config';

const TIMEOUT_DURATION = 10000; // 10 seconds
const WARNING_DURATION = 5000; // 5 seconds

function PlayerRegister() {
  const [step, setStep] = useState('start');
  const [hasPackage, setHasPackage] = useState(false);
  const [player, setPlayer] = useState({ firstName: '', lastName: '' });
  const [registrationResult, setRegistrationResult] = useState(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCounter, setTimeoutCounter] = useState(5);
  const [tournamentPlayer, setTournamentPlayer] = useState({ firstName: '', lastName: '' });

  const timeoutIdRef = useRef(null);
  const warningTimeoutIdRef = useRef(null);
  const countdownIdRef = useRef(null);

  const resetToStart = useCallback(() => {
    setStep('start');
    setHasPackage(false);
    setPlayer({ firstName: '', lastName: '' });
    setRegistrationResult(null);
    setShowTimeoutWarning(false);
    setTimeoutCounter(5);
  }, []);

  const resetTimeout = useCallback(() => {
    setShowTimeoutWarning(false);
    setTimeoutCounter(5);
    clearTimeout(timeoutIdRef.current);
    clearTimeout(warningTimeoutIdRef.current);
    clearInterval(countdownIdRef.current);

    timeoutIdRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      warningTimeoutIdRef.current = setTimeout(resetToStart, WARNING_DURATION);
      countdownIdRef.current = setInterval(() => {
        setTimeoutCounter((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIdRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_DURATION);
  }, [resetToStart]);

  useEffect(() => {
    let redirectTimer;
    if (step === 'result') {
      redirectTimer = setTimeout(() => {
        resetToStart();
      }, 5000);
    }
    return () => clearTimeout(redirectTimer);
  }, [step, resetToStart]);

  useEffect(() => {
    if (step !== 'start' && step !== 'result') {
      resetTimeout();
    }

    return () => {
      clearTimeout(timeoutIdRef.current);
      clearTimeout(warningTimeoutIdRef.current);
      clearInterval(countdownIdRef.current);
    };
  }, [step, resetTimeout]);

  const handleInputChange = (e) => {
    setPlayer({ ...player, [e.target.name]: e.target.value });
    resetTimeout();
  };

  const registerPlayer = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-players`, {
        players: [player],
        useDropInPackage: hasPackage,
        packageUses: hasPackage ? 1 : 0
      });
      setRegistrationResult(response.data);
      setStep('result');
    } catch (error) {
      console.error('Player registration error', error);
      alert('Player registration failed. Please try again.');
    }
  };

  const registerTournamentPlayer = async () => {
    try {
      const response = await axios.post(`${config.apiBaseUrl}/register-players`, {
        players: [tournamentPlayer],
        useDropInPackage: false,
        packageUses: 0,
      });
      setRegistrationResult(response.data);
      setStep('tournamentResult');
    } catch (error) {
      console.error('Tournament player registration error', error);
      alert('Tournament player registration failed. Please try again.');
    }
  };

  const goBack = () => {
    switch (step) {
      case 'dropIn':
      case 'classSignIn':
      case 'courtReservation':
        setStep('start');
        break;
      case 'noPackageWarning':
      case 'playerInfo':
        setStep('dropIn');
        break;
      default:
        break;
    }
    resetTimeout();
  };

  const renderStep = () => {
    switch (step) {
      case 'start':
        return (
          <div className="space-y-4">
            <button 
              onClick={() => { setStep('tournamentCheckIn'); resetTimeout(); }} 
              className="w-full bg-yellow-500 text-white py-3 text-xl rounded-md hover:bg-yellow-600 transition duration-300"
            >
              Tournament Check In
            </button>
            <button onClick={() => { setStep('dropIn'); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">Drop In</button>
            <button onClick={() => { setStep('classSignIn'); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">Sign in for Class</button>
            <button onClick={() => { setStep('courtReservation'); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">Court Reservation</button>
          </div>
        );
      case 'dropIn':
        return (
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold mb-4">Do you have a package?</h3>
            <button onClick={() => { setHasPackage(true); setStep('playerInfo'); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">Yes</button>
            <button onClick={() => { setHasPackage(false); setStep('noPackageWarning'); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">No</button>
          </div>
        );
      case 'noPackageWarning':
        return (
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-4 text-red-600">Warning</h3>
            <p className="text-lg mb-6">PLEASE <strong>CONFIRM WITH FRONT DESK</strong> THAT YOU DO <strong>NOT</strong> HAVE A PACKAGE</p>
            <button onClick={() => { setStep('playerInfo'); resetTimeout(); }} className="w-full bg-red-600 text-white py-3 text-xl rounded-md hover:bg-red-700 transition duration-300">Confirm</button>
          </div>
        );
      case 'playerInfo':
        return (
          <div className="space-y-4">
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={player.firstName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={player.lastName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button onClick={() => { registerPlayer(); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">Sign In</button>
          </div>
        );
      case 'classSignIn':
      case 'courtReservation':
        return (
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold mb-4">Please confirm with the front desk</h3>
            <button onClick={() => { setStep('start'); resetTimeout(); }} className="w-full bg-primary text-white py-3 text-xl rounded-md hover:bg-green-600 transition duration-300">Back to Start</button>
          </div>
        );

        case 'tournamentCheckIn':
          return (
            <div className="space-y-4">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={tournamentPlayer.firstName}
                onChange={(e) => {
                  setTournamentPlayer({ ...tournamentPlayer, firstName: e.target.value });
                  resetTimeout();
                }}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={tournamentPlayer.lastName}
                onChange={(e) => {
                  setTournamentPlayer({ ...tournamentPlayer, lastName: e.target.value });
                  resetTimeout();
                }}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button 
                onClick={() => { registerTournamentPlayer(); resetTimeout(); }} 
                className="w-full bg-yellow-500 text-white py-3 text-xl rounded-md hover:bg-yellow-600 transition duration-300"
              >
                Confirm Check In!
              </button>
            </div>
          );
        case 'tournamentResult':
          return (
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Tournament Check-In Successful!</h3>
              <p className="mb-2 text-3xl font-bold">
                <span className="text-primary">Name:</span> {tournamentPlayer.firstName} {tournamentPlayer.lastName}
              </p>
              <p className="text-lg text-gray-600">Returning to start in 5 seconds...</p>
            </div>
          );
        case 'result':
          return (
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Registration Successful!</h3>
              {registrationResult.players.map((player, index) => (
                <div key={index} className="mb-8">
                  <p className="mb-2 text-3xl font-bold">
                    <span className="text-primary">Username:</span> {player.username}
                  </p>
                  <p className="mb-2 text-3xl font-bold">
                    <span className="text-primary">Temporary Password:</span> {player.tempPassword}
                  </p>
                </div>
              ))}
              <p className="text-lg text-gray-600">Returning to start in 5 seconds...</p>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl relative">
        {step !== 'start' && step !== 'result' && (
          <button
            onClick={goBack}
            className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        )}
        <button
          onClick={resetToStart}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        >
          🏠 Home
        </button>
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Player Check-In</h2>
        {renderStep()}
      </div>
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" onClick={resetTimeout}>
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-red-600">Warning</h3>
            <p className="text-lg mb-6">Session will timeout in {timeoutCounter} seconds due to inactivity.</p>
            <p className="text-md">Tap anywhere to continue.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerRegister;