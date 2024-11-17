/*
 * @brief List of all colors that are dynamically given to the title given.
 * Type: { [key: number]: string; }
 */
const Colors = {
     0: "text-red-500 border-b-2 border-red-700",
     1: "text-green-500 border-b-2 border-green-700",
     2: "text-blue-500 border-b-2 border-blue-700",
     3: "text-yellow-500 border-b-2 border-yellow-700",
     4: "text-purple-500 border-b-2 border-purple-700",
     5: "text-orange-500 border-b-2 border-orange-700",
     6: "text-pink-500 border-b-2 border-pink-700",
     7: "text-teal-500 border-b-2 border-teal-700",
     8: "text-indigo-500 border-b-2 border-indigo-700",
     9: "text-lime-500 border-b-2 border-lime-700",
    10: "text-cyan-500 border-b-2 border-cyan-700",
    11: "text-gray-500 border-b-2 border-gray-700",
} as {
    [key: number]: string;
}

const Title = ({ title }: { title: string }) => {
  const titleSplitted: string[] = title.split("");

  return (
    <header className="w-full mb-8 text-center">
      <h1 className="text-5xl font-bold text-center bg-white border border-gray-400 p-2 rounded-md shadow-md font-patrick-hand">
        {titleSplitted.map((letter: string, index: number) => (
          <span key={index} className={Colors[index % Object.keys(Colors).length] as string}>
            {letter}
          </span>
        ))}
      </h1>
    </header>
  );
}

export default Title;
