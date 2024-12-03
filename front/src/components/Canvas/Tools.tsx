import { useState } from "react";

export type ToolsType = "pencil" | "eraser";

const DrawingTools = ({ onToolChange } : any) => {
  const [selectedColor, setSelectedColor] = useState<string>("#000000");
  const [toolSize     , setToolSize]      = useState<number>(5);
  const [activeTool   , setActiveTool]    = useState<ToolsType>("pencil");

  const tools = [
    { name: "pencil", label: "✏️ Pencil" },
    { name: "eraser", label: "🧽 Eraser" },
  ];

  const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFFFFF"];

  const handleToolChange = (tool: ToolsType) => {
    setActiveTool(tool);

    onToolChange({ tool, color: selectedColor, size: toolSize });
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);

    onToolChange({ tool: activeTool, color, size: toolSize });
  };

  const handleSizeChange = (size: any) => {
    setToolSize(size);

    onToolChange({ tool: activeTool, color: selectedColor, size });
  };

  return (
    <div className="w-full flex flex-row justify-around p-4 mt-2 bg-[#f9f9f9] border-2 border-[#c44b4a] rounded-lg shadow-md space-y-4">
      <div>
        <h3 className="text-sm font-bold mb-2">Couleur</h3>
        <div className="flex space-x-2">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 ${selectedColor === color ? "border-black" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2">Outil</h3>
        <div className="flex space-x-2">
          {tools.map((tool) => (
            <button
              key={tool.name}
              className={`px-4 py-2 rounded ${
                activeTool === tool.name ? "bg-blue-500 text-[#f9f9f9]" : "bg-gray-200"
              }`}
              onClick={() => handleToolChange(tool.name as ToolsType)}
            >
              {tool.label}
            </button>
          ))}
          <button className="px-4 py-2 rounded text-[#f9f9f9]" onClick={() => handleToolChange("eraser")}>Clear</button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2">Taille</h3>
        <input
          type="range"
          min="1"
          max="20"
          value={toolSize}
          onChange={(e) => handleSizeChange(e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-gray-600 text-center mt-1">Taille: {toolSize}</p>
      </div>
    </div>
  );
};

export default DrawingTools;
