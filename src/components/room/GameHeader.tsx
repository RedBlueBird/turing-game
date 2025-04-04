interface GameHeaderProps {
  title: string;
  round: number;
  remainingTime: number;
  subtitle?: string;
  isMobile?: boolean;
}

export function GameHeader({ title, round, remainingTime, subtitle, isMobile }: GameHeaderProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full text-center mb-8 mt-8">
      <h1 className="text-4xl md:text-6xl font-bold mb-4 text-gray-900">
        {title}
      </h1>
      <p className="text-1xl md:text-xl text-gray-700 mb-4">
        Round {round} • Time Remaining: <span className="text-red-500 font-medium">{formatTime(remainingTime)}</span>
      </p>
      {subtitle && (
        <p className="text-1xl md:text-xl text-gray-700">{subtitle}</p>
      )}
      {isMobile && (
        <p className="text-xs text-gray-500 mb-2">
          (swipe left/right to switch panels)
        </p>
      )}
    </div>
  );
} 