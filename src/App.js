import React, { useState } from 'react';
import munkres from 'munkres-js';

// Стилизация компонентов
const buttonStyle = (color) => ({
  padding: '10px 20px',
  backgroundColor: color,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px',
  margin: '5px'
});

const cardStyle = (isSelected, isRecommended) => ({
  padding: '15px',
  border: isRecommended ? '2px solid #FF9800' : isSelected ? '2px solid #4CAF50' : '1px solid #ddd',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: isSelected ? '#e8f5e9' : 'white',
  transition: 'all 0.3s ease',
  margin: '5px',
  ':hover': {
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  }
});

const sectionStyle = {
  marginBottom: '30px',
  padding: '20px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px'
};

// const tableHeaderStyle = {
//   padding: '12px',
//   borderBottom: '2px solid #ddd',
//   textAlign: 'left'
// };

// const tableCellStyle = {
//   padding: '12px',
//   borderBottom: '1px solid #eee'
// };

// Алгоритмы оптимизации
const optimizePairs = (teamMembers, opponents, ratings, method = 'full') => {
  switch (method) {
    case 'greedy':
      return greedyAlgorithm(teamMembers, opponents, ratings);
    case 'full':
      return fullSearchOptimize(teamMembers, opponents, ratings);
    default:
      return hungarianAlgorithm(teamMembers, opponents, ratings);
  }
};

const hungarianAlgorithm = (teamMembers, opponents, ratings) => {
  const matrix = teamMembers.map(player => 
    opponents.map(opponent => 6 - ratings[player][opponent])
  );

  const result = munkres(matrix);
  const pairs = result.map(([playerIdx, opponentIdx]) => ({
    player: teamMembers[playerIdx],
    opponent: opponents[opponentIdx],
    rating: ratings[teamMembers[playerIdx]][opponents[opponentIdx]]
  }));

  return adaptToTournamentRules(pairs, teamMembers, opponents, ratings);
};

const greedyAlgorithm = (teamMembers, opponents, ratings) => {
  const pairs = [];
  const usedPlayers = new Set();
  const usedOpponents = new Set();

  const allPairs = [];
  teamMembers.forEach(player => {
    opponents.forEach(opponent => {
      allPairs.push({
        player,
        opponent,
        rating: ratings[player][opponent]
      });
    });
  });
  allPairs.sort((a, b) => b.rating - a.rating);

  allPairs.forEach(pair => {
    if (!usedPlayers.has(pair.player) && !usedOpponents.has(pair.opponent)) {
      pairs.push(pair);
      usedPlayers.add(pair.player);
      usedOpponents.add(pair.opponent);
    }
  });

  return adaptToTournamentRules(pairs, teamMembers, opponents, ratings);
};

const fullSearchOptimize = (teamMembers, opponents, ratings) => {
  if (teamMembers.length > 5) {
    return hungarianAlgorithm(teamMembers, opponents, ratings);
  }

  const allPermutations = generatePermutations([...opponents]);
  let bestScore = -1;
  let bestPairs = [];

  allPermutations.forEach(permutation => {
    const currentPairs = teamMembers.map((player, index) => ({
      player,
      opponent: permutation[index],
      rating: ratings[player][permutation[index]]
    }));
    
    const currentScore = currentPairs.reduce((sum, pair) => sum + pair.rating, 0);
    
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestPairs = currentPairs;
    }
  });

  return adaptToTournamentRules(bestPairs, teamMembers, opponents, ratings);
};

const generatePermutations = (arr) => {
  if (arr.length <= 1) return [arr];
  const result = [];
  
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const remainingPerms = generatePermutations(remaining);
    
    for (const perm of remainingPerms) {
      result.push([current, ...perm]);
    }
  }
  
  return result;
};

const adaptToTournamentRules = (pairs, teamMembers, opponents, ratings) => {
  const result = [];
  const usedPlayers = new Set();
  const usedOpponents = new Set();

  // Выбираем двух лучших защитников
  const defenders = findBestDefenders(pairs, 2);
  defenders.forEach(defender => {
    result.push({ ...defender, type: 'defender' });
    usedPlayers.add(defender.player);
    usedOpponents.add(defender.opponent);
  });

  // Выбираем четырех лучших атакующих
  const remainingPairs = pairs.filter(p => 
    !usedPlayers.has(p.player) && !usedOpponents.has(p.opponent)
  );
  const attackers = findBestAttackers(remainingPairs, 4);
  attackers.forEach(attacker => {
    result.push({ ...attacker, type: 'attacker' });
    usedPlayers.add(attacker.player);
    usedOpponents.add(attacker.opponent);
  });

  // Добавляем оставшиеся пары
  pairs.forEach(pair => {
    if (!usedPlayers.has(pair.player) && !usedOpponents.has(pair.opponent)) {
      result.push({ ...pair, type: 'remaining' });
    }
  });

  return result;
};

const findBestDefenders = (pairs, count) => {
  const playerScores = {};
  
  pairs.forEach(pair => {
    if (!playerScores[pair.player]) {
      playerScores[pair.player] = { sum: 0, count: 0, pairs: [] };
    }
    playerScores[pair.player].sum += pair.rating;
    playerScores[pair.player].count++;
    playerScores[pair.player].pairs.push(pair);
  });

  return Object.entries(playerScores)
    .map(([player, data]) => ({
      player,
      avg: data.sum / data.count,
      bestPair: data.pairs.reduce((best, current) => 
        current.rating > best.rating ? current : best
      )
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, count)
    .map(item => item.bestPair);
};

const findBestAttackers = (pairs, count) => {
  return [...pairs]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count);
};

// Основной компонент приложения
const App = () => {
  // Состояния для названий команд
  const [ourTeamName, setOurTeamName] = useState('Наша команда');
  const [opponentTeamName, setOpponentTeamName] = useState('Команда оппонентов');
  const [optimizationMethod, setOptimizationMethod] = useState('full');

  // Состояния для игроков
  const [teamMembers, setTeamMembers] = useState(['Игрок 1', 'Игрок 2', 'Игрок 3', 'Игрок 4', 'Игрок 5']);
  const [opponents, setOpponents] = useState(['Оппонент 1', 'Оппонент 2', 'Оппонент 3', 'Оппонент 4', 'Оппонент 5']);

  // Состояния для редактирования имен
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editedName, setEditedName] = useState('');

  // Состояния для оценок
  const [ratings, setRatings] = useState(() => {
    const initialRatings = {};
    teamMembers.forEach(player => {
      initialRatings[player] = {};
      opponents.forEach(opponent => {
        initialRatings[player][opponent] = 3;
      });
    });
    return initialRatings;
  });

  // Состояния для процесса паринга
  const [step, setStep] = useState(0);
  const [firstDefender, setFirstDefender] = useState(null);
  const [opponentFirstDefender, setOpponentFirstDefender] = useState(null);
  const [firstAttackers, setFirstAttackers] = useState([]);
  const [opponentFirstAttackers, setOpponentFirstAttackers] = useState([]);
  const [firstAttackerChoice, setFirstAttackerChoice] = useState(null);
  const [opponentFirstAttackerChoice, setOpponentFirstAttackerChoice] = useState(null);
  const [secondDefender, setSecondDefender] = useState(null);
  const [opponentSecondDefender, setOpponentSecondDefender] = useState(null);
  const [secondAttackers, setSecondAttackers] = useState([]);
  const [opponentSecondAttackers, setOpponentSecondAttackers] = useState([]);
  const [secondAttackerChoice, setSecondAttackerChoice] = useState(null);
  const [opponentSecondAttackerChoice, setOpponentSecondAttackerChoice] = useState(null);
  const [finalPairs, setFinalPairs] = useState([]);
  // const [comparison, setComparison] = useState(null);

  // Функции для редактирования имен
  const startEditing = (player, isOpponent = false) => {
    setEditingPlayer({ player, isOpponent });
    setEditedName(player);
  };

  const saveEditedName = () => {
    if (editedName.trim() === '') return;
    
    const oldName = editingPlayer.player;
    const newName = editedName.trim();

    // Проверка на уникальность имени
    const namesList = editingPlayer.isOpponent ? opponents : teamMembers;
    if (namesList.includes(newName) && newName !== oldName) {
      alert('Игрок с таким именем уже существует!');
      return;
    }

    if (editingPlayer.isOpponent) {
      setOpponents(prev => prev.map(op => op === oldName ? newName : op));
      
      setRatings(prev => {
        const newRatings = {};
        Object.keys(prev).forEach(player => {
          newRatings[player] = { ...prev[player] };
          if (prev[player][oldName] !== undefined) {
            newRatings[player][newName] = prev[player][oldName];
            delete newRatings[player][oldName];
          }
        });
        return newRatings;
      });
    } else {
      setTeamMembers(prev => prev.map(pl => pl === oldName ? newName : pl));
      
      setRatings(prev => {
        const newRatings = { ...prev };
        if (newRatings[oldName]) {
          newRatings[newName] = { ...newRatings[oldName] };
          delete newRatings[oldName];
        }
        return newRatings;
      });
    }
    
    // Обновляем выбранных игроков
    const updateSelected = (selected) => {
      if (selected === oldName) return newName;
      if (Array.isArray(selected)) return selected.map(item => item === oldName ? newName : item);
      return selected;
    };

    setFirstDefender(updateSelected(firstDefender));
    setOpponentFirstDefender(updateSelected(opponentFirstDefender));
    setFirstAttackers(prev => prev.map(p => p === oldName ? newName : p));
    setOpponentFirstAttackers(prev => prev.map(o => o === oldName ? newName : o));
    setFirstAttackerChoice(updateSelected(firstAttackerChoice));
    setOpponentFirstAttackerChoice(updateSelected(opponentFirstAttackerChoice));
    setSecondDefender(updateSelected(secondDefender));
    setOpponentSecondDefender(updateSelected(opponentSecondDefender));
    setSecondAttackers(prev => prev.map(p => p === oldName ? newName : p));
    setOpponentSecondAttackers(prev => prev.map(o => o === oldName ? newName : o));
    setSecondAttackerChoice(updateSelected(secondAttackerChoice));
    setOpponentSecondAttackerChoice(updateSelected(opponentSecondAttackerChoice));

    setEditingPlayer(null);
    setEditedName('');
  };

  const renderEditableName = (name, isOpponent = false) => {
    if (editingPlayer?.player === name && editingPlayer?.isOpponent === isOpponent) {
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            style={{ 
              padding: '5px',
              marginRight: '5px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxWidth: '80px'
            }}
            autoFocus
          />
          <button 
            onClick={saveEditedName}
            style={{ 
              padding: '5px 10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '5px'
            }}
          >
            ✓
          </button>
          <button 
            onClick={() => setEditingPlayer(null)}
            style={{ 
              padding: '5px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: '10px' }}>{name}</span>
        <button 
          onClick={() => startEditing(name, isOpponent)}
          style={{ 
            padding: '2px 5px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Изменить
        </button>
      </div>
    );
  };

  // Функции для логики паринга
  const getOptimalRecommendations = (currentStep) => {
    const availablePlayers = [...teamMembers];
    const availableOpponents = [...opponents];
    
    // Удаляем уже выбранных игроков
    if (firstDefender && currentStep !== 1) availablePlayers.splice(availablePlayers.indexOf(firstDefender), 1);
    if (secondDefender) availablePlayers.splice(availablePlayers.indexOf(secondDefender), 1);
    firstAttackers.forEach(p => availablePlayers.splice(availablePlayers.indexOf(p), 1));
    secondAttackers.forEach(p => availablePlayers.splice(availablePlayers.indexOf(p), 1));
    if (opponentFirstAttackerChoice) availablePlayers.splice(availablePlayers.indexOf(opponentFirstAttackerChoice), 1);
    
    // Удаляем уже выбранных оппонентов
    if (opponentFirstDefender) availableOpponents.splice(availableOpponents.indexOf(opponentFirstDefender), 1);
    if (opponentSecondDefender) availableOpponents.splice(availableOpponents.indexOf(opponentSecondDefender), 1);
    opponentFirstAttackers.forEach(o => availableOpponents.splice(availableOpponents.indexOf(o), 1));
    opponentSecondAttackers.forEach(o => availableOpponents.splice(availableOpponents.indexOf(o), 1));
    if (firstAttackerChoice) availableOpponents.splice(availableOpponents.indexOf(firstAttackerChoice), 1);
    if (secondAttackerChoice) availableOpponents.splice(availableOpponents.indexOf(secondAttackerChoice), 1);
    
    // Вычисляем оптимальные пары для оставшихся игроков
    const optimalPairs = optimizePairs(availablePlayers, availableOpponents, ratings, optimizationMethod);
    
    // Возвращаем рекомендации для текущего шага
    switch(currentStep) {
      case 1: // Выбор первого защитника
        const bestDefender = optimalPairs.find(p => p.type === 'defender')?.player || 
          calculateBestDefender(availablePlayers, availableOpponents);
        return { defender: bestDefender };
      
      case 2: // Выбор атакующих против первого защитника оппонентов
        const bestAttackers = optimalPairs
          .filter(p => p.type === 'attacker')
          .slice(0, 2)
          .map(p => p.player) || 
          calculateBestAttackers(opponentFirstDefender, availablePlayers);
        return { attackers: bestAttackers };
      
      case 3: // Выбор атакующего для нашего первого защитника
        const bestFirstAttackerChoice = optimalPairs
          .find(p => p.player === firstDefender)?.opponent || 
          calculateBestAttackerChoice(opponentFirstAttackers, firstDefender);
        return { attackerChoice: bestFirstAttackerChoice };
      
      case 4: // Выбор второго защитника
        const bestSecondDefender = optimalPairs
          .find(p => p.type === 'defender' && p.player !== firstDefender)?.player || 
          calculateBestDefender(
            availablePlayers.filter(p => p !== firstDefender && !firstAttackers.includes(p)), 
            availableOpponents
          );
        return { defender: bestSecondDefender };
      
      case 5: // Выбор атакующих против второго защитника оппонентов
        const bestSecondAttackers = optimalPairs
          .filter(p => p.type === 'attacker')
          .slice(0, 2)
          .map(p => p.player) || 
          calculateBestAttackers(opponentSecondDefender, 
            availablePlayers.filter(p => p !== secondDefender));
        return { attackers: bestSecondAttackers };
      
      case 6: // Выбор атакующего для нашего второго защитника
        const bestSecondAttackerChoice = optimalPairs
          .find(p => p.player === secondDefender)?.opponent || 
          calculateBestAttackerChoice(opponentSecondAttackers, secondDefender);
        return { attackerChoice: bestSecondAttackerChoice };
      
      default:
        return {};
    }
  };

  const calculateBestDefender = (availablePlayers, opponentAvailable) => {
    if (!availablePlayers || availablePlayers.length === 0) return null;
    
    const opponentsToCheck = opponentAvailable || opponents;
    if (!opponentsToCheck || opponentsToCheck.length === 0) return availablePlayers[0];

    const playerScores = availablePlayers.map(player => {
      const scores = opponentsToCheck.map(opp => ratings[player][opp] || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return { player, score: avg };
    });
    
    return playerScores.sort((a, b) => b.score - a.score)[0]?.player || availablePlayers[0];
  };

  const calculateBestAttackers = (defender, availablePlayers) => {
    if (!defender || !availablePlayers || availablePlayers.length === 0) return [];
    
    const playerScores = availablePlayers.map(player => ({
      player,
      score: ratings[player][defender] || 0
    }));
    
    return playerScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.player);
  };

  const calculateBestAttackerChoice = (attackers, defender) => {
    if (!attackers || attackers.length === 0 || !defender) return null;
    
    const attackerScores = attackers.map(attacker => ({
      attacker,
      score: ratings[defender][attacker] || 0
    }));
    
    return attackerScores.sort((a, b) => b.score - a.score)[0]?.attacker || null;
  };

  const collectManualPairs = () => {
    const pairs = [];
    
    if (firstDefender && firstAttackerChoice) {
      pairs.push({
        ourPlayer: firstDefender,
        opponent: firstAttackerChoice,
        rating: ratings[firstDefender][firstAttackerChoice],
        type: 'defender'
      });
    }
    
    if (secondDefender && secondAttackerChoice) {
      pairs.push({
        ourPlayer: secondDefender,
        opponent: secondAttackerChoice,
        rating: ratings[secondDefender][secondAttackerChoice],
        type: 'defender'
      });
    }
    
    if (opponentFirstAttackerChoice && opponentFirstDefender) {
      pairs.push({
        ourPlayer: opponentFirstAttackerChoice,
        opponent: opponentFirstDefender,
        rating: ratings[opponentFirstAttackerChoice][opponentFirstDefender],
        type: 'attacker'
      });
    }
    
    if (opponentSecondAttackerChoice && opponentSecondDefender) {
      pairs.push({
        ourPlayer: opponentSecondAttackerChoice,
        opponent: opponentSecondDefender,
        rating: ratings[opponentSecondAttackerChoice][opponentSecondDefender],
        type: 'attacker'
      });
    }
    
    // Оставшиеся игроки
    const allPlayers = new Set(teamMembers);
    const allOpponents = new Set(opponents);
    
    pairs.forEach(pair => {
      allPlayers.delete(pair.ourPlayer);
      allOpponents.delete(pair.opponent);
    });
    
    const remainingPlayer = Array.from(allPlayers)[0];
    const remainingOpponent = Array.from(allOpponents)[0];
    
    if (remainingPlayer && remainingOpponent) {
      pairs.push({
        ourPlayer: remainingPlayer,
        opponent: remainingOpponent,
        rating: ratings[remainingPlayer][remainingOpponent],
        type: 'remaining'
      });
    }
    
    return pairs;
  };

  // const hybridAlgorithm = () => {
  //   const manualPairs = collectManualPairs();
  //   const usedPlayers = new Set(manualPairs.map(p => p.ourPlayer));
  //   const usedOpponents = new Set(manualPairs.map(p => p.opponent));
    
  //   const availablePlayers = teamMembers.filter(p => !usedPlayers.has(p));
  //   const availableOpponents = opponents.filter(o => !usedOpponents.has(o));
    
  //   if (availablePlayers.length === 0 || availableOpponents.length === 0) {
  //     return manualPairs;
  //   }
    
  //   const optimalRemainingPairs = optimizePairs(
  //     availablePlayers,
  //     availableOpponents,
  //     ratings,
  //     optimizationMethod
  //   );
    
  //   return [...manualPairs, ...optimalRemainingPairs];
  // };

  const calculateFinalPairs = () => {
    const manualPairs = collectManualPairs();
    // const hybridPairs = hybridAlgorithm();
    // const optimalPairs = optimizePairs(teamMembers, opponents, ratings, optimizationMethod);
    
    setFinalPairs(manualPairs);
    
    // setComparison({
    //   manual: manualPairs.reduce((sum, pair) => sum + pair.rating, 0),
    //   hybrid: hybridPairs.reduce((sum, pair) => sum + pair.rating, 0),
    //   optimal: optimalPairs.reduce((sum, pair) => sum + pair.rating, 0)
    // });
  };

  const nextStep = () => {
    if (step === 0) {
      setStep(1);
      const optimal = getOptimalRecommendations(1);
      setFirstDefender(optimal.defender);
    } else if (step === 1) {
      setStep(2);
      const optimal = getOptimalRecommendations(2);
      setFirstAttackers(optimal.attackers);
    } else if (step === 2) {
      setStep(3);
      const optimal = getOptimalRecommendations(3);
      setFirstAttackerChoice(optimal.attackerChoice);
    } else if (step === 3) {
      setStep(4);
      const optimal = getOptimalRecommendations(4);
      setSecondDefender(optimal.defender);
    } else if (step === 4) {
      setStep(5);
      const optimal = getOptimalRecommendations(5);
      setSecondAttackers(optimal.attackers);
    } else if (step === 5) {
      setStep(6);
      const optimal = getOptimalRecommendations(6);
      setSecondAttackerChoice(optimal.attackerChoice);
    } else if (step === 6) {
      calculateFinalPairs();
      setStep(7);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const reset = () => {
    setStep(0);
    setFirstDefender(null);
    setOpponentFirstDefender(null);
    setFirstAttackers([]);
    setOpponentFirstAttackers([]);
    setFirstAttackerChoice(null);
    setOpponentFirstAttackerChoice(null);
    setSecondDefender(null);
    setOpponentSecondDefender(null);
    setSecondAttackers([]);
    setOpponentSecondAttackers([]);
    setSecondAttackerChoice(null);
    setOpponentSecondAttackerChoice(null);
    setFinalPairs([]);
    // setComparison(null);
  };

  const updateRating = (player, opponent, value) => {
    setRatings(prev => ({
      ...prev,
      [player]: {
        ...prev[player],
        [opponent]: parseInt(value)
      }
    }));
  };

  // Компоненты для отображения
  const OptimizationVisualization = ({ pairs }) => {
    return (
      <div style={{ marginTop: '20px' }}>
        <h3>Результаты паринга:</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '10px'
        }}>
          {pairs.map((pair, index) => (
            <div key={index} style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: getPairColor(pair.type)
            }}>
              <div><strong>Пара {index + 1}</strong></div>
              <div>{pair.ourPlayer} vs {pair.opponent}</div>
              <div>Оценка: {pair.rating}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPairColor = (type) => {
    switch(type) {
      case 'defender': return '#e3f2fd';
      case 'attacker': return '#fff8e1';
      default: return '#e8f5e9';
    }
  };

  // const AlgorithmComparison = () => {
  //   if (!comparison) return null;
    
  //   return (
  //     <div style={{ marginTop: '30px' }}>
  //       <h3>Сравнение с алгоритмами:</h3>
  //       <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
  //         <thead>
  //           <tr>
  //             <th style={tableHeaderStyle}>Метод</th>
  //             <th style={tableHeaderStyle}>Общая оценка</th>
  //             <th style={tableHeaderStyle}>Разница</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           <tr>
  //             <td style={tableCellStyle}>Ваш выбор</td>
  //             <td style={tableCellStyle}>{comparison.manual}</td>
  //             <td style={tableCellStyle}>-</td>
  //           </tr>
  //           <tr>
  //             <td style={tableCellStyle}>Гибридный (ваш + алгоритм)</td>
  //             <td style={tableCellStyle}>{comparison.hybrid}</td>
  //             <td style={tableCellStyle}>
  //               {Math.round((comparison.hybrid - comparison.manual) / comparison.manual * 100)}%
  //             </td>
  //           </tr>
  //           <tr>
  //             <td style={tableCellStyle}>Полностью оптимальный</td>
  //             <td style={tableCellStyle}>{comparison.optimal}</td>
  //             <td style={tableCellStyle}>
  //               {Math.round((comparison.optimal - comparison.manual) / comparison.manual * 100)}%
  //             </td>
  //           </tr>
  //         </tbody>
  //       </table>
  //       {comparison.optimal > comparison.hybrid && (
  //         <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fffde7', borderRadius: '4px' }}>
  //           <p>Оптимальный алгоритм даёт улучшение на {comparison.optimal - comparison.hybrid} очков</p>
  //           <button 
  //             onClick={() => {
  //               setFinalPairs(optimizePairs(teamMembers, opponents, ratings, optimizationMethod));
  //               setComparison({
  //                 ...comparison,
  //                 hybrid: comparison.optimal
  //               });
  //             }}
  //             style={buttonStyle('#4CAF50')}
  //           >
  //             Применить оптимальные пары
  //           </button>
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  // Рендеринг компонента
  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Паринги
      </h1>
      
      {step === 0 && (
        <div style={sectionStyle}>
          <h2 style={{ color: '#444' }}>Настройка команд</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>
              Название нашей команды:
              <input
                type="text"
                value={ourTeamName}
                onChange={(e) => setOurTeamName(e.target.value)}
                style={{ 
                  padding: '8px',
                  marginLeft: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  width: '200px'
                }}
              />
            </label>
            
            <label style={{ display: 'block' }}>
              Название команды оппонентов:
              <input
                type="text"
                value={opponentTeamName}
                onChange={(e) => setOpponentTeamName(e.target.value)}
                style={{ 
                  padding: '8px',
                  marginLeft: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  width: '200px'
                }}
              />
            </label>
          </div>
          
          <div style={{ margin: '20px 0' }}>
            <label>
              <strong>Алгоритм оптимизации:</strong>
              <select 
                value={optimizationMethod} 
                onChange={(e) => setOptimizationMethod(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="greedy">Жадный алгоритм (быстрый)</option>
                <option value="full">Полный перебор (точный)</option>
              </select>
            </label>
          </div>
          
          <h3 style={{ marginBottom: '15px' }}>Игроки {ourTeamName}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {teamMembers.map(player => (
              <div key={player} style={cardStyle(false)}>
                {renderEditableName(player)}
              </div>
            ))}
          </div>
          
          <h3 style={{ marginBottom: '15px' }}>Игроки {opponentTeamName}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {opponents.map(opponent => (
              <div key={opponent} style={cardStyle(false)}>
                {renderEditableName(opponent, true)}
              </div>
            ))}
          </div>
          
          <h2 style={{ color: '#444', marginTop: '30px' }}>Введите оценки игроков</h2>
          <p style={{ marginBottom: '20px' }}>Оцените шансы каждого игрока против оппонентов (1 - плохо, 5 - отлично)</p>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'left' }}>Игрок \ Оппонент</th>
                  {opponents.map(opponent => (
                    <th key={opponent} style={{ padding: '12px', borderBottom: '2px solid #ddd', textAlign: 'center' }}>{opponent}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(player => (
                  <tr key={player}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{player}</td>
                    {opponents.map(opponent => (
                      <td key={opponent} style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                        <select 
                          value={ratings[player][opponent]} 
                          onChange={(e) => updateRating(player, opponent, e.target.value)}
                          style={{ 
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            width: '60px'
                          }}
                        >
                          {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={nextStep} style={buttonStyle('#4CAF50')}>
              Начать паринг
            </button>
          </div>
        </div>
      )}
      
      {step === 1 && (
        <div style={sectionStyle}>
          <h2>Шаг 1: Выбор первого защитника</h2>          
          <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd' }}>
            <h3>1. Наш первый защитник</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '15px' }}>
              {teamMembers.map(player => (
                <div 
                  key={player}
                  style={cardStyle(firstDefender === player, player === getOptimalRecommendations(1).defender)}
                  onClick={() => setFirstDefender(player)}
                >
                  {player}
                  {firstDefender === player && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                  {player === getOptimalRecommendations(1).defender && (
                    <div style={{ color: '#FF9800', fontSize: '0.8em', marginTop: '5px' }}>
                      Рекомендуется алгоритмом
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ ...sectionStyle, backgroundColor: '#fff8e1' }}>
            <h3>2. Первый защитник оппонентов</h3>
            <p>Выберите, кого оппоненты выставили в качестве первого защитника:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {opponents.map(opponent => (
                <div 
                  key={opponent}
                  style={cardStyle(opponentFirstDefender === opponent)}
                  onClick={() => setOpponentFirstDefender(opponent)}
                >
                  {opponent}
                  {opponentFirstDefender === opponent && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} style={buttonStyle('#f44336')}>
              Назад
            </button>
            <button 
              onClick={nextStep} 
              disabled={!opponentFirstDefender}
              style={buttonStyle(opponentFirstDefender ? '#4CAF50' : '#9E9E9E')}
            >
              Далее
            </button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div style={sectionStyle}>
          <h2>Шаг 2: Атакующие против первого защитника оппонентов</h2>
          <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd' }}>
            <h3>1. Наши атакующие против {opponentFirstDefender}</h3>
            <p>Выберите двух игроков:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {teamMembers
                .filter(p => p !== firstDefender)
                .map(player => (
                  <div
                    key={player}
                    style={cardStyle(firstAttackers.includes(player), getOptimalRecommendations(2).attackers.includes(player))}
                    onClick={() => {
                      if (firstAttackers.includes(player)) {
                        setFirstAttackers(firstAttackers.filter(p => p !== player));
                      } else if (firstAttackers.length < 2) {
                        setFirstAttackers([...firstAttackers, player]);
                      }
                    }}
                  >
                    {player}
                    <div style={{ marginTop: '10px' }}>
                      Оценка против {opponentFirstDefender}: <strong>{ratings[player][opponentFirstDefender]}</strong>
                    </div>
                    {firstAttackers.includes(player) && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                    {getOptimalRecommendations(2).attackers.includes(player) && (
                      <div style={{ color: '#FF9800', fontSize: '0.8em', marginTop: '5px' }}>
                        Рекомендуется алгоритмом
                      </div>
                    )}
                  </div>
                ))}
            </div>
            {firstAttackers.length < 2 && (
              <p style={{ color: '#f44336' }}>Необходимо выбрать еще {2 - firstAttackers.length} игрока</p>
            )}
          </div>
          
          <div style={{ ...sectionStyle, backgroundColor: '#fff8e1' }}>
            <h3>2. Атакующие оппонентов против нашего {firstDefender}</h3>
            <p>Отметьте двух оппонентов:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {opponents
                .filter(o => o !== opponentFirstDefender)
                .map(opponent => (
                  <div
                    key={opponent}
                    style={cardStyle(opponentFirstAttackers.includes(opponent))}
                    onClick={() => {
                      if (opponentFirstAttackers.includes(opponent)) {
                        setOpponentFirstAttackers(opponentFirstAttackers.filter(o => o !== opponent));
                      } else if (opponentFirstAttackers.length < 2) {
                        setOpponentFirstAttackers([...opponentFirstAttackers, opponent]);
                      }
                    }}
                  >
                    {opponent}
                    {opponentFirstAttackers.includes(opponent) && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                  </div>
                ))}
            </div>
            {opponentFirstAttackers.length < 2 && (
              <p style={{ color: '#f44336' }}>Необходимо выбрать еще {2 - opponentFirstAttackers.length} оппонента</p>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} style={buttonStyle('#f44336')}>
              Назад
            </button>
            <button 
              onClick={nextStep} 
              disabled={firstAttackers.length !== 2 || opponentFirstAttackers.length !== 2}
              style={buttonStyle(
                firstAttackers.length === 2 && opponentFirstAttackers.length === 2 ? '#4CAF50' : '#9E9E9E'
              )}
            >
              Далее
            </button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div style={sectionStyle}>
          <h2>Шаг 3: Выбор атакующего для первого защитника</h2>
          <div style={{ ...sectionStyle, backgroundColor: '#fff8e1' }}>
            <h3>1. Выберите атакующего оппонента против нашего {firstDefender}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {opponentFirstAttackers.map(opponent => (
                <div
                  key={opponent}
                  style={cardStyle(firstAttackerChoice === opponent, opponent === getOptimalRecommendations(3).attackerChoice)}
                  onClick={() => setFirstAttackerChoice(opponent)}
                >
                  {opponent}
                  <div style={{ marginTop: '10px' }}>
                    Оценка {firstDefender} против {opponent}: <strong>{ratings[firstDefender][opponent]}</strong>
                  </div>
                  {firstAttackerChoice === opponent && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                  {opponent === getOptimalRecommendations(3).attackerChoice && (
                    <div style={{ color: '#FF9800', fontSize: '0.8em', marginTop: '5px' }}>
                      Рекомендуется алгоритмом
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd' }}>
            <h3>2. Отметьте, кого оппоненты выбрали из ваших атакующих против их защитника {opponentFirstDefender}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {firstAttackers.map(player => (
                <div
                  key={player}
                  style={cardStyle(opponentFirstAttackerChoice === player)}
                  onClick={() => setOpponentFirstAttackerChoice(player)}
                >
                  {player}
                  <div style={{ marginTop: '10px' }}>
                    Оценка против {opponentFirstDefender}: <strong>{ratings[player][opponentFirstDefender]}</strong>
                  </div>
                  {opponentFirstAttackerChoice === player && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} style={buttonStyle('#f44336')}>
              Назад
            </button>
            <button 
              onClick={nextStep} 
              disabled={!firstAttackerChoice || !opponentFirstAttackerChoice}
              style={buttonStyle(
                firstAttackerChoice && opponentFirstAttackerChoice ? '#4CAF50' : '#9E9E9E'
              )}
            >
              Далее
            </button>
          </div>
        </div>
      )}
      
      {step === 4 && (
        <div style={sectionStyle}>
          <h2>Шаг 4: Выбор второго защитника</h2>
          <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd' }}>
            <h3>1. Наш второй защитник</h3>
            <p>Доступные игроки: {teamMembers
              .filter(p => p !== firstDefender && !firstAttackers.includes(p) && p !== opponentFirstAttackerChoice)
              .join(', ')}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {teamMembers
                .filter(p => p !== firstDefender && !firstAttackers.includes(p) && p !== opponentFirstAttackerChoice)
                .map(player => (
                  <div
                    key={player}
                    style={cardStyle(secondDefender === player, player === getOptimalRecommendations(4).defender)}
                    onClick={() => setSecondDefender(player)}
                  >
                    {player}
                    <div style={{ marginTop: '10px', fontSize: '14px' }}>
                      Средняя оценка: {(
                        opponents
                          .filter(o => o !== opponentFirstDefender && !opponentFirstAttackers.includes(o) && o !== firstAttackerChoice)
                          .reduce((sum, opp) => sum + ratings[player][opp], 0) / 
                        (opponents.length - 3)
                      ).toFixed(1)}
                    </div>
                    {secondDefender === player && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                    {player === getOptimalRecommendations(4).defender && (
                      <div style={{ color: '#FF9800', fontSize: '0.8em', marginTop: '5px' }}>
                        Рекомендуется алгоритмом
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
          
          <div style={{ ...sectionStyle, backgroundColor: '#fff8e1' }}>
            <h3>2. Второй защитник оппонентов</h3>
            <p>Выберите, кого оппоненты выставили:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {opponents
                .filter(o => o !== opponentFirstDefender && !opponentFirstAttackers.includes(o) && o !== firstAttackerChoice)
                .map(opponent => (
                  <div
                    key={opponent}
                    style={cardStyle(opponentSecondDefender === opponent)}
                    onClick={() => setOpponentSecondDefender(opponent)}
                  >
                    {opponent}
                    {opponentSecondDefender === opponent && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                  </div>
                ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} style={buttonStyle('#f44336')}>
              Назад
            </button>
            <button 
              onClick={nextStep} 
              disabled={!opponentSecondDefender}
              style={buttonStyle(opponentSecondDefender ? '#4CAF50' : '#9E9E9E')}
            >
              Далее
            </button>
          </div>
        </div>
      )}
      
      {step === 5 && (
        <div style={sectionStyle}>
          <h2>Шаг 5: Атакующие против второго защитника оппонентов</h2>
          <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd' }}>
            <h3>1. Наши атакующие против {opponentSecondDefender}</h3>
            <p>Выберите двух игроков:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {teamMembers
                .filter(p => 
                  p !== firstDefender && 
                  p !== secondDefender && 
                  p !== opponentFirstAttackerChoice
                )
                .map(player => (
                  <div
                    key={player}
                    style={cardStyle(secondAttackers.includes(player), getOptimalRecommendations(5).attackers.includes(player))}
                    onClick={() => {
                      if (secondAttackers.includes(player)) {
                        setSecondAttackers(secondAttackers.filter(p => p !== player));
                      } else if (secondAttackers.length < 2) {
                        setSecondAttackers([...secondAttackers, player]);
                      }
                    }}
                  >
                    {player}
                    <div style={{ marginTop: '10px' }}>
                      Оценка против {opponentSecondDefender}: <strong>{ratings[player][opponentSecondDefender]}</strong>
                    </div>
                    {secondAttackers.includes(player) && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                    {getOptimalRecommendations(5).attackers.includes(player) && (
                      <div style={{ color: '#FF9800', fontSize: '0.8em', marginTop: '5px' }}>
                        Рекомендуется алгоритмом
                      </div>
                    )}
                  </div>
                ))}
            </div>
            {secondAttackers.length < 2 && (
              <p style={{ color: '#f44336' }}>Необходимо выбрать еще {2 - secondAttackers.length} игрока</p>
            )}
          </div>
          
          <div style={{ ...sectionStyle, backgroundColor: '#fff8e1' }}>
            <h3>2. Атакующие оппонентов против нашего {secondDefender}</h3>
            <p>Отметьте двух оппонентов:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {opponents
                .filter(o => 
                  o !== opponentFirstDefender && 
                  o !== opponentSecondDefender && 
                  o !== firstAttackerChoice
                )
                .map(opponent => (
                  <div
                    key={opponent}
                    style={cardStyle(opponentSecondAttackers.includes(opponent))}
                    onClick={() => {
                      if (opponentSecondAttackers.includes(opponent)) {
                        setOpponentSecondAttackers(opponentSecondAttackers.filter(o => o !== opponent));
                      } else if (opponentSecondAttackers.length < 2) {
                        setOpponentSecondAttackers([...opponentSecondAttackers, opponent]);
                      }
                    }}
                  >
                    {opponent}
                    {opponentSecondAttackers.includes(opponent) && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                  </div>
                ))}
            </div>
            {opponentSecondAttackers.length < 2 && (
              <p style={{ color: '#f44336' }}>Необходимо выбрать еще {2 - opponentSecondAttackers.length} оппонента</p>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} style={buttonStyle('#f44336')}>
              Назад
            </button>
            <button 
              onClick={nextStep} 
              disabled={secondAttackers.length !== 2 || opponentSecondAttackers.length !== 2}
              style={buttonStyle(
                secondAttackers.length === 2 && opponentSecondAttackers.length === 2 ? '#4CAF50' : '#9E9E9E'
              )}
            >
              Далее
            </button>
          </div>
        </div>
      )}
      
      {step === 6 && (
        <div style={sectionStyle}>
          <h2>Шаг 6: Выбор атакующего для второго защитника</h2>
          <div style={{ ...sectionStyle, backgroundColor: '#fff8e1' }}>
            <h3>1. Выберите атакующего оппонента против нашего {secondDefender}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {opponentSecondAttackers.map(opponent => (
                <div
                  key={opponent}
                  style={cardStyle(secondAttackerChoice === opponent, opponent === getOptimalRecommendations(6).attackerChoice)}
                  onClick={() => setSecondAttackerChoice(opponent)}
                >
                  {opponent}
                  <div style={{ marginTop: '10px' }}>
                    Оценка {secondDefender} против {opponent}: <strong>{ratings[secondDefender][opponent]}</strong>
                  </div>
                  {secondAttackerChoice === opponent && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                  {opponent === getOptimalRecommendations(6).attackerChoice && (
                    <div style={{ color: '#FF9800', fontSize: '0.8em', marginTop: '5px' }}>
                      Рекомендуется алгоритмом
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ ...sectionStyle, backgroundColor: '#e3f2fd' }}>
            <h3>2. Отметьте, кого оппоненты выбрали из ваших атакующих против их защитника {opponentSecondDefender}</h3>  
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
              {secondAttackers.map(player => (
                <div
                  key={player}
                  style={cardStyle(opponentSecondAttackerChoice === player)}
                  onClick={() => setOpponentSecondAttackerChoice(player)}
                >
                  {player}
                  <div style={{ marginTop: '10px' }}>
                    Оценка против {opponentSecondDefender}: <strong>{ratings[player][opponentSecondDefender]}</strong>
                  </div>
                  {opponentSecondAttackerChoice === player && <span style={{ float: 'right', color: '#4CAF50' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} style={buttonStyle('#f44336')}>
              Назад
            </button>
            <button 
              onClick={nextStep} 
              disabled={!secondAttackerChoice || !opponentSecondAttackerChoice}
              style={buttonStyle(
                secondAttackerChoice && opponentSecondAttackerChoice ? '#4CAF50' : '#9E9E9E'
              )}
            >
              Завершить паринг
            </button>
          </div>
        </div>
      )}
      
      {step === 7 && (
        <div style={sectionStyle}>
          <h2 style={{ textAlign: 'center' }}>Итоговые пары</h2>
          <p style={{ textAlign: 'center', fontSize: '18px' }}>
            Общая сумма оценок: <strong>{finalPairs.reduce((sum, pair) => sum + pair.rating, 0)}</strong>
          </p>
          
          <OptimizationVisualization pairs={finalPairs} />
          {/* <AlgorithmComparison /> */}
          
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button onClick={reset} style={buttonStyle('#2196F3')}>
              Начать новый паринг
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
