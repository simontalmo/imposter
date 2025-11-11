import React, { useState, useEffect } from 'react';
import { Users, Play, Vote, Trophy, RefreshCw, AlertCircle } from 'lucide-react';

const WORDS = {
  dyr: ['Elefant', 'Pingvin', 'Delfin', 'Tiger', 'Kenguru', 'Bjørn', 'Rev', 'Ugle', 'Hai', 'Papegøye', 'Zebra', 'Giraff', 'Panda', 'Koala', 'Leopard'],
  ting: ['Piano', 'Paraply', 'Kompass', 'Teleskop', 'Koffert', 'Lommelykt', 'Mikrofon', 'Kamera', 'Sykkel', 'Skateboard', 'Trampoline', 'Fyrstikk', 'Hammer', 'Ferdigrett']
};

export default function ImposterGame() {
  const [gameState, setGameState] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roomCode) {
      loadGameState();
      const interval = setInterval(loadGameState, 2000);
      return () => clearInterval(interval);
    }
  }, [roomCode]);

  useEffect(() => {
    if (roomCode && currentPlayer) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [roomCode, currentPlayer]);

  const loadGameState = async () => {
    try {
      const result = await window.storage.get(`game:${roomCode}`, true);
      if (result && result.value) {
        setGameState(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('Kunne ikke laste spilldata:', error);
    }
  };

  const saveGameState = async (newState) => {
    if (!roomCode) return;
    try {
      await window.storage.set(`game:${roomCode}`, JSON.stringify(newState), true);
      setGameState(newState);
    } catch (error) {
      console.error('Kunne ikke lagre spillet:', error);
    }
  };

  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Skriv inn navnet ditt!');
      return;
    }
    setError('');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const playerId = Math.random().toString(36).substring(7);
    
    const newGame = {
      phase: 'lobby',
      players: [{ id: playerId, name: playerName, score: 0 }],
      word: null,
      imposter: null,
      votes: {},
      category: 'dyr'
    };
    
    try {
      await window.storage.set(`game:${code}`, JSON.stringify(newGame), true);
      setRoomCode(code);
      setCurrentPlayer({ id: playerId, name: playerName });
      setGameState(newGame);
    } catch (error) {
      setError('Kunne ikke lage rom');
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      setError('Skriv inn navnet ditt!');
      return;
    }
    if (!roomInput.trim()) {
      setError('Skriv inn rom-kode!');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const roomCodeUpper = roomInput.toUpperCase();
      console.log('Prøver å bli med i rom:', roomCodeUpper);
      
      const result = await window.storage.get(`game:${roomCodeUpper}`, true);
      console.log('Storage resultat:', result);
      
      if (!result || !result.value) {
        setError(`Rom "${roomCodeUpper}" ble ikke funnet! Sjekk at koden er riktig.`);
        setLoading(false);
        return;
      }
      
      const game = JSON.parse(result.value);
      console.log('Spill funnet:', game);
      
      // Sjekk om navnet allerede er i bruk
      if (game.players.find(p => p.name === playerName)) {
        setError('Dette navnet er allerede i bruk! Velg et annet navn.');
        setLoading(false);
        return;
      }
      
      // Legg til ny spiller
      const playerId = Math.random().toString(36).substring(7);
      const newPlayer = { id: playerId, name: playerName, score: 0 };
      game.players.push(newPlayer);
      
      console.log('Lagrer oppdatert spill med ny spiller:', game);
      
      // Lagre oppdatert spillstatus
      const saveResult = await window.storage.set(`game:${roomCodeUpper}`, JSON.stringify(game), true);
      console.log('Lagret:', saveResult);
      
      // Oppdater local state
      setRoomCode(roomCodeUpper);
      setCurrentPlayer({ id: playerId, name: playerName });
      setGameState(game);
      
      console.log('✅ Vellykket join!');
      
    } catch (error) {
      console.error('❌ Feil ved joining:', error);
      setError(`Kunne ikke bli med i rommet: ${error.message}`);
    }
    
    setLoading(false);
  };

  const startGame = async () => {
    if (gameState.players.length < 3) {
      setError('Trenger minst 3 spillere!');
      return;
    }

    setError('');
    const category = Math.random() > 0.5 ? 'dyr' : 'ting';
    const wordList = WORDS[category];
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const imposterIndex = Math.floor(Math.random() * gameState.players.length);

    const newState = {
      ...gameState,
      phase: 'showWord',
      word: word,
      imposter: gameState.players[imposterIndex].id,
      category: category,
      votes: {}
    };
    
    await saveGameState(newState);
    
    setTimeout(async () => {
      await saveGameState({ ...newState, phase: 'discussion' });
    }, 8000);
  };

  const startVoting = async () => {
    await saveGameState({ ...gameState, phase: 'voting', votes: {} });
    setVoted(false);
  };

  const castVote = async (votedPlayerId) => {
    if (voted) return;
    
    const newVotes = { ...gameState.votes };
    newVotes[currentPlayer.id] = votedPlayerId;
    
    await saveGameState({ ...gameState, votes: newVotes });
    setVoted(true);

    if (Object.keys(newVotes).length === gameState.players.length) {
      setTimeout(() => showResults(newVotes), 1000);
    }
  };

  const showResults = async (votes) => {
    const voteCounts = {};
    Object.values(votes).forEach(votedId => {
      voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
    });

    let maxVotes = 0;
    let suspectId = null;
    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        suspectId = id;
      }
    });

    const newPlayers = gameState.players.map(p => {
      if (suspectId === gameState.imposter && p.id !== gameState.imposter) {
        return { ...p, score: p.score + 1 };
      } else if (suspectId !== gameState.imposter && p.id === gameState.imposter) {
        return { ...p, score: p.score + 2 };
      }
      return p;
    });

    await saveGameState({
      ...gameState,
      phase: 'results',
      players: newPlayers,
      suspectId: suspectId
    });
  };

  const playAgain = async () => {
    await saveGameState({
      ...gameState,
      phase: 'lobby',
      word: null,
      imposter: null,
      votes: {},
      suspectId: null
    });
    setVoted(false);
  };

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-5xl font-black text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            IMPOSTER
          </h1>
          <p className="text-center text-gray-600 mb-8">Hvem lyver om ordet?</p>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border-2 border-red-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" />
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Ditt navn"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border-3 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 text-lg"
            />
            
            <button
              onClick={createRoom}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transform transition shadow-lg"
            >
              Lag nytt rom
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">eller</span>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Rom-kode"
              value={roomInput}
              onChange={(e) => {
                setRoomInput(e.target.value.toUpperCase());
                setError('');
              }}
              className="w-full px-4 py-3 border-3 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 text-lg"
            />
            
            <button
              onClick={() => {
                console.log('🔘 Bli med i rom knappen klikket!');
                console.log('Navn:', playerName, 'Rom-kode:', roomInput);
                joinRoom();
              }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transform transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Kobler til...' : 'Bli med i rom'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-white text-2xl">Laster...</div>
      </div>
    );
  }

  const isImposter = currentPlayer && gameState.imposter === currentPlayer.id;
  const imposterPlayer = gameState.players.find(p => p.id === gameState.imposter);
  const suspectPlayer = gameState.players.find(p => p.id === gameState.suspectId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              IMPOSTER
            </h1>
            <div className="bg-purple-100 px-4 py-2 rounded-full">
              <span className="font-bold text-purple-700">ROM: {roomCode}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border-2 border-red-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" />
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          )}

          {gameState.phase === 'lobby' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-purple-500" />
                <h2 className="text-2xl font-bold">Spillere ({gameState.players.length})</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {gameState.players.map((player, i) => (
                  <div key={player.id} className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-xl">
                    <div className="font-bold text-lg">{player.name}</div>
                    <div className="text-sm text-gray-600">Poeng: {player.score}</div>
                  </div>
                ))}
              </div>

              {gameState.players.length >= 3 && (
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-xl hover:scale-105 transform transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Play /> Start spillet!
                </button>
              )}
              
              {gameState.players.length < 3 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 text-center">
                  <p className="text-xl font-bold text-yellow-800 mb-2">
                    ⏳ Venter på flere spillere...
                  </p>
                  <p className="text-gray-600">
                    Trenger minst 3 spillere for å starte ({gameState.players.length}/3)
                  </p>
                  <div className="mt-4 bg-white p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      📱 Del rom-koden med venner:
                    </p>
                    <div className="bg-purple-100 px-6 py-3 rounded-lg inline-block">
                      <span className="text-3xl font-black text-purple-700 tracking-wider">
                        {roomCode}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {gameState.phase === 'showWord' && (
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold mb-6">
                {isImposter ? 'Du er IMPOSTEREN! 🕵️' : 'Memoriser ordet:'}
              </h2>
              
              {!isImposter && (
                <div className="bg-gradient-to-r from-yellow-300 to-orange-300 p-8 rounded-2xl inline-block mb-4">
                  <div className="text-6xl font-black text-white drop-shadow-lg">
                    {gameState.word}
                  </div>
                </div>
              )}
              
              {isImposter && (
                <div className="bg-gradient-to-r from-red-400 to-pink-400 p-8 rounded-2xl inline-block mb-4">
                  <div className="text-4xl font-black text-white drop-shadow-lg">
                    Du vet ikke ordet!<br/>
                    Prøv å gjette det og blande deg inn!
                  </div>
                </div>
              )}
              
              <p className="text-gray-600 text-lg mt-4">Kategori: {gameState.category === 'dyr' ? '🐾 Dyr' : '🔧 Ting'}</p>
            </div>
          )}

          {gameState.phase === 'discussion' && (
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold mb-4">💬 Diskusjonstid!</h2>
              <p className="text-xl text-gray-600 mb-6">
                Snakk sammen og finn ut hvem som er imposteren
              </p>
              
              <div className="bg-blue-50 p-6 rounded-xl mb-6">
                <p className="text-lg font-semibold text-blue-800">
                  Tips: Still spørsmål om ordet uten å avsløre det!
                </p>
              </div>

              <button
                onClick={startVoting}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-bold text-xl hover:scale-105 transform transition shadow-lg flex items-center justify-center gap-2 mx-auto"
              >
                <Vote /> Start avstemning
              </button>
            </div>
          )}

          {gameState.phase === 'voting' && (
            <div>
              <h2 className="text-3xl font-bold text-center mb-6">🗳️ Stem på imposteren!</h2>
              
              {voted && (
                <div className="bg-green-100 text-green-800 p-4 rounded-xl text-center mb-4 font-bold">
                  Din stemme er registrert! Venter på andre...
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {gameState.players.map(player => (
                  <button
                    key={player.id}
                    onClick={() => castVote(player.id)}
                    disabled={voted}
                    className={`p-6 rounded-xl font-bold text-xl transition transform hover:scale-105 ${
                      voted
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-lg'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
              
              <div className="text-center mt-4 text-gray-600">
                {Object.keys(gameState.votes).length} / {gameState.players.length} har stemt
              </div>
            </div>
          )}

          {gameState.phase === 'results' && (
            <div className="text-center py-8">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-4xl font-bold mb-6">Resultater!</h2>
              
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 rounded-2xl mb-6">
                <p className="text-2xl font-bold mb-2">Ordet var:</p>
                <p className="text-5xl font-black text-purple-600 mb-4">{gameState.word}</p>
                
                <p className="text-xl mb-2">Imposteren var:</p>
                <p className="text-3xl font-bold text-red-600">{imposterPlayer?.name}</p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-xl mb-6">
                <p className="text-xl font-bold mb-2">Dere stemte på:</p>
                <p className="text-2xl font-bold text-orange-600">{suspectPlayer?.name}</p>
                
                {suspectPlayer?.id === imposterPlayer?.id ? (
                  <p className="text-green-600 font-bold text-xl mt-4">✅ Dere fant imposteren!</p>
                ) : (
                  <p className="text-red-600 font-bold text-xl mt-4">❌ Imposteren lurte dere!</p>
                )}
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4">Poengstilling:</h3>
                <div className="space-y-2">
                  {gameState.players.sort((a, b) => b.score - a.score).map((player, i) => (
                    <div key={player.id} className="bg-white p-4 rounded-xl flex justify-between items-center border-2 border-purple-200">
                      <span className="font-bold text-lg">
                        {i === 0 && '👑 '}{player.name}
                      </span>
                      <span className="text-2xl font-black text-purple-600">{player.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={playAgain}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-xl hover:scale-105 transform transition shadow-lg flex items-center justify-center gap-2 mx-auto"
              >
                <RefreshCw /> Spill igjen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

