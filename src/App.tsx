import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import brickImageSrc from './assets/images/brick.png';
import gameOverSoundSrc from './assets/sounds/gameover.mp4';
import winSoundSrc from './assets/sounds/win.m4a';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  width: number;
  height: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const animationFrameRef = useRef<number>();
  const gameOverSound = useRef<HTMLAudioElement>(null);
  const winSound = useRef<HTMLAudioElement>(null);

  // Game constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDLE_HEIGHT = 20;
  const PADDLE_WIDTH = 100;
  const BALL_RADIUS = 8;
  const BRICK_ROWS = 3;
  const BRICK_COLS = 5;
  const BRICK_WIDTH = CANVAS_WIDTH / BRICK_COLS - 10;
  const BRICK_HEIGHT = 80;
  const BRICK_PADDING = 10;
  const BALL_SPEED = 5;

  // Game state
  const [paddle, setPaddle] = useState<Paddle>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  });

  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10,
    dx: BALL_SPEED,
    dy: -BALL_SPEED,
    radius: BALL_RADIUS,
  });

  const [bricks, setBricks] = useState<Brick[]>(() => {
    const bricksArray: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricksArray.push({
          x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING,
          y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          visible: true,
        });
      }
    }
    return bricksArray;
  });

  // Load friend's image
  const brickImage = new Image();
  brickImage.src = brickImageSrc;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (!gameStarted || gameOver || isPaused) {
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw paddle
      ctx.fillStyle = '#333';
      ctx.fillRect(
        paddle.x,
        CANVAS_HEIGHT - paddle.height,
        paddle.width,
        paddle.height
      );

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      ctx.closePath();

      // Draw bricks
      bricks.forEach((brick) => {
        if (brick.visible) {
          // Save the current context state
          ctx.save();
          
          // Create a clipping region for the brick
          ctx.beginPath();
          ctx.rect(brick.x, brick.y, brick.width, brick.height);
          ctx.clip();
          
          // Calculate dimensions to maintain aspect ratio
          const aspectRatio = brickImage.width / brickImage.height;
          const targetHeight = brick.height;
          const targetWidth = targetHeight * aspectRatio;
          
          // Center the image horizontally within the brick
          const x = brick.x - (targetWidth - brick.width) / 2;
          
          // Draw the image
          ctx.drawImage(
            brickImage,
            x,
            brick.y,
            targetWidth,
            targetHeight
          );
          
          // Restore the context state
          ctx.restore();
        }
      });

      // Move ball
      setBall((prevBall) => {
        let newBall = { ...prevBall };
        newBall.x += newBall.dx;
        newBall.y += newBall.dy;

        // Wall collisions
        if (newBall.x + newBall.radius > CANVAS_WIDTH || newBall.x - newBall.radius < 0) {
          newBall.dx = -newBall.dx;
        }
        if (newBall.y - newBall.radius < 0) {
          newBall.dy = -newBall.dy;
        }

        // Paddle collision
        if (
          newBall.y + newBall.radius > CANVAS_HEIGHT - PADDLE_HEIGHT &&
          newBall.x > paddle.x &&
          newBall.x < paddle.x + paddle.width
        ) {
          newBall.dy = -newBall.dy;
        }

        // Game over
        if (newBall.y + newBall.radius > CANVAS_HEIGHT) {
          setGameOver(true);
          if (gameOverSound.current) {
            gameOverSound.current.play();
          }
          return prevBall; // Keep the ball where it is when game is over
        }

        return newBall;
      });

      // Brick collision
      bricks.forEach((brick, index) => {
        if (brick.visible) {
          if (
            ball.x > brick.x &&
            ball.x < brick.x + brick.width &&
            ball.y > brick.y &&
            ball.y < brick.y + brick.height
          ) {
            setBall((prevBall) => ({
              ...prevBall,
              dy: -prevBall.dy,
            }));
            setBricks((prevBricks) =>
              prevBricks.map((b, i) =>
                i === index ? { ...b, visible: false } : b
              )
            );
            setScore((prevScore) => {
              const newScore = prevScore + 100;
              // Check if all bricks are destroyed
              const remainingBricks = bricks.filter(b => b.visible).length - 1; // -1 because current brick isn't updated yet
              if (remainingBricks === 0) {
                if (winSound.current) {
                  winSound.current.play();
                }
                setGameOver(true); // Stop the game when player wins
              }
              return newScore;
            });
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPaused) {
        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        setPaddle((prevPaddle) => ({
          ...prevPaddle,
          x: Math.min(
            Math.max(mouseX - PADDLE_WIDTH / 2, 0),
            CANVAS_WIDTH - PADDLE_WIDTH
          ),
        }));
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, ball, paddle, bricks]);

  const resetGame = () => {
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10,
      dx: BALL_SPEED,
      dy: -BALL_SPEED,
      radius: BALL_RADIUS,
    });
    setPaddle({
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    });
    setBricks((prevBricks) =>
      prevBricks.map((brick) => ({ ...brick, visible: true }))
    );
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-white mb-2">فرقع الملط</h1>
          <div className="flex items-center justify-center gap-4">
            <p className="text-xl text-gray-300">Score: {score}</p>
            {gameStarted && !gameOver && (
              <button
                onClick={togglePause}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="bg-gray-800 rounded-lg shadow-xl"
            onClick={() => !gameStarted && !gameOver && setGameStarted(true)}
          />
          <audio 
            ref={gameOverSound}
            src={gameOverSoundSrc}
          />
          <audio 
            ref={winSound}
            src={winSoundSrc}
          />
          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                onClick={() => setGameStarted(true)}
              >
                Start Game
              </button>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center">
                {bricks.some(brick => brick.visible) ? (
                  <h2 className="text-3xl font-bold text-white mb-4">جرا ايه يا ابو كيكة مش عارف تكسب</h2>
                ) : (
                  <h2 className="text-3xl font-bold text-white mb-4">مبروك كسبت! 🎉</h2>
                )}
                <p className="text-xl text-white mb-4">Final Score: {score}</p>
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                  onClick={resetGame}
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Paused</h2>
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2 mx-auto"
                  onClick={togglePause}
                >
                  <Play size={20} />
                  Resume Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;