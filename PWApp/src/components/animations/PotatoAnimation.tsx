export const PotatoAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="potato-emoji animate-float">
        🥔
      </div>
      <div className="flex gap-2 mt-4">
        <span className="text-4xl animate-bounce" style={{ animationDelay: '0s' }}>✨</span>
        <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
        <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
      </div>
    </div>
  );
};
