
const Round = ({ currentRound, totalRounds }: { currentRound?: number; totalRounds?: number }) => {
  return (
    <div className="text-lg font-semibold">
      Rounds {currentRound ?? 0} / {totalRounds ?? 0}
    </div>
  );
}

export default Round;
