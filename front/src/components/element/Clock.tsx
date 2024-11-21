const Clock = ({ time }: { time: number }) => {
  return (
    <div
      className="relative w-[64px] h-[64px] flex items-center justify-center bg-center bg-cover"
      style={{ backgroundImage: "url('clock.gif')" }}
    >
      <span className="text-gray-800 pt-1 text-lg font-bold">{time}</span>
    </div>
  );
}

export default Clock;
