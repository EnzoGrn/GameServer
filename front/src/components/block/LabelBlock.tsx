const LabelBlock = ({ blockName, children }: Readonly<{ blockName: string; children: React.ReactNode; }>) => {
  return (
    <label className="block mb-4">
      <span className="text-gray-700">{blockName}</span>
      {children}
    </label>
  );
};

export default LabelBlock;
