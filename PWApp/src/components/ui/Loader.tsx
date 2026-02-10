interface LoaderProps {
  message?: string;
  subMessage?: string;
}

export const Loader = ({ message, subMessage }: LoaderProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="spinner" />
      {message && (
        <p className="text-lg font-semibold text-primary animate-pulse-slow">
          {message}
        </p>
      )}
      {subMessage && (
        <p className="text-sm text-gray-600 text-center max-w-sm">
          {subMessage}
        </p>
      )}
    </div>
  );
};
