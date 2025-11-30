import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  const gameId = ref('');
  const gameStatus = ref('setup'); // setup, playing, ended
  const currentYear = ref(1);
  const currentPosition = ref(1);

  function setGame(id: string) {
    gameId.value = id;
  }

  function startGame() {
    gameStatus.value = 'playing';
  }

  function endGame() {
    gameStatus.value = 'ended';
  }

  return {
    gameId,
    gameStatus,
    currentYear,
    currentPosition,
    setGame,
    startGame,
    endGame
  };
});
