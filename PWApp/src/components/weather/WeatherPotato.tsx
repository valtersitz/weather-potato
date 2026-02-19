import { useEffect, useState } from 'react';

interface WeatherPotatoProps {
  condition: string;
  temperature: number;
}

/**
 * Cute potato character that changes based on weather conditions
 */
export const WeatherPotato = ({ condition, temperature }: WeatherPotatoProps) => {
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    // Trigger bounce animation when weather changes
    setBounce(true);
    const timer = setTimeout(() => setBounce(false), 600);
    return () => clearTimeout(timer);
  }, [condition]);

  const getPotatoExpression = () => {
    const lowerCondition = condition.toLowerCase();

    // Sunny/Clear
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) {
      return {
        face: '😎',
        accessory: '🕶️',
        body: '🥔',
        color: 'from-yellow-300 to-orange-400',
        message: "I'm feeling sunny!"
      };
    }

    // Cloudy/Partly Cloudy
    if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
      return {
        face: '😊',
        accessory: '☁️',
        body: '🥔',
        color: 'from-gray-300 to-gray-400',
        message: "Nice and cloudy!"
      };
    }

    // Rainy
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return {
        face: '🌂',
        accessory: '☔',
        body: '🥔',
        color: 'from-blue-300 to-blue-500',
        message: "Splish splash!"
      };
    }

    // Thunderstorm
    if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
      return {
        face: '😨',
        accessory: '⚡',
        body: '🥔',
        color: 'from-purple-400 to-gray-700',
        message: "It's electric!"
      };
    }

    // Snow
    if (lowerCondition.includes('snow') || lowerCondition.includes('ice')) {
      return {
        face: '🥶',
        accessory: '❄️',
        body: '🥔',
        color: 'from-blue-100 to-blue-300',
        message: "Brrr! So cold!"
      };
    }

    // Hot weather
    if (temperature > 30) {
      return {
        face: '🥵',
        accessory: '☀️',
        body: '🥔',
        color: 'from-red-300 to-orange-500',
        message: "Too hot to handle!"
      };
    }

    // Cold weather
    if (temperature < 5) {
      return {
        face: '🥶',
        accessory: '🧣',
        body: '🥔',
        color: 'from-blue-200 to-cyan-400',
        message: "Freezing potato!"
      };
    }

    // Default
    return {
      face: '😌',
      accessory: '🌤️',
      body: '🥔',
      color: 'from-primary-light to-secondary',
      message: "Weather is nice!"
    };
  };

  const potato = getPotatoExpression();

  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Accessory emoji above the potato */}
      <div className="text-5xl mb-2">{potato.accessory}</div>

      {/* Potato body */}
      <div
        className={`filter drop-shadow-2xl bg-gradient-to-br ${potato.color} rounded-full flex items-center justify-center ${bounce ? 'animate-bounce' : ''}`}
        style={{ width: '180px', height: '180px', transition: 'transform 0.3s ease' }}
      >
        <span className="text-7xl">{potato.body}</span>
      </div>

      {/* Mood / face indicator below the potato */}
      <div className="text-4xl mt-3">{potato.face}</div>

      {/* Speech bubble */}
      <div className="mt-4 bg-white rounded-2xl px-6 py-3 shadow-lg relative">
        <div
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '10px solid white'
          }}
        />
        <p className="text-gray-700 font-fun text-lg">
          {potato.message}
        </p>
      </div>
    </div>
  );
};
