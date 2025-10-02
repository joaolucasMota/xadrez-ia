'use client';

import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function Home() {
  const [game, setGame] = useState(() => new Chess());
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const position = useMemo(() => game.fen(), [game]);

  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameStarted(true);
    setGameOver(false);
    setWinner(null);

    // IA faz a primeira jogada
    setTimeout(() => makeAiMove(newGame), 500);
  };

  const checkGameOver = (chess: Chess) => {
    if (chess.isGameOver()) {
      setGameOver(true);
      if (chess.isCheckmate()) {
        setWinner(chess.turn() === 'w' ? 'IA Burra venceu!' : 'Você venceu!');
      } else {
        setWinner('Empate!');
      }
      return true;
    }
    return false;
  };

  const makeAiMove = async (currentGame: Chess) => {
    setIsThinking(true);
    try {
      console.log('Chamando API para movimento da IA...');
      console.log('FEN atual:', currentGame.fen());

      const response = await fetch('/api/ai-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: currentGame.fen() }),
      });

      const data = await response.json();
      console.log('Resposta da API:', data);

      if (data.move) {
        console.log('IA escolheu o movimento:', data.move);

        // Criar nova instância do jogo
        const newGame = new Chess(currentGame.fen());
        console.log('Movimentos possíveis:', newGame.moves());

        // Tentar fazer o movimento
        try {
          const result = newGame.move(data.move);
          console.log('Resultado do movimento:', result);

          if (result) {
            console.log('Movimento aplicado com sucesso!');
            console.log('Novo FEN:', newGame.fen());
            setGame(new Chess(newGame.fen()));
            checkGameOver(newGame);
          } else {
            console.error('Movimento retornou null');
          }
        } catch (moveError) {
          console.error('Erro ao aplicar movimento:', moveError);
        }
      } else {
        console.error('API não retornou movimento válido:', data);
      }
    } catch (error) {
      console.error('Erro ao obter movimento da IA:', error);
    } finally {
      setIsThinking(false);
    }
  };

  const onPieceDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    console.log('onPieceDrop chamado:', { sourceSquare, targetSquare, gameStarted, gameOver, isThinking });

    if (!gameStarted) {
      console.log('Jogo não iniciado');
      return false;
    }

    if (gameOver) {
      console.log('Jogo já terminou');
      return false;
    }

    if (isThinking) {
      console.log('IA está pensando');
      return false;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      console.log('Movimento tentado:', move);

      if (move === null) {
        console.log('Movimento inválido');
        return false;
      }

      console.log('Movimento válido, atualizando jogo');
      setGame(new Chess(gameCopy.fen()));

      if (checkGameOver(gameCopy)) return true;

      // IA joga após movimento do jogador
      setTimeout(() => makeAiMove(gameCopy), 500);

      return true;
    } catch (error) {
      console.error('Erro ao mover peça:', error);
      return false;
    }
  }, [game, gameStarted, gameOver, isThinking]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800">
      <h1 className="text-4xl font-bold text-white mb-8">Xadrez com IA Burra</h1>

      {!gameStarted ? (
        <button
          onClick={startGame}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors mb-8"
        >
          Começar Partida
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 flex items-center justify-center">
            {isThinking && (
              <div className="text-yellow-400 font-semibold text-lg">
                IA está pensando...
              </div>
            )}
            {gameOver && winner && (
              <div className="bg-white text-gray-900 font-bold py-4 px-8 rounded-lg text-2xl">
                {winner}
              </div>
            )}
          </div>

          <div className="w-[560px] max-w-[90vw]">
            <Chessboard
              position={position}
              onPieceDrop={onPieceDrop}
              arePiecesDraggable={!gameOver && !isThinking}
              boardOrientation="black"
              boardWidth={560}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>

          <button
            onClick={startGame}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors mt-4"
          >
            Nova Partida
          </button>
        </div>
      )}
    </div>
  );
}
