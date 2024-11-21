/*
 * @brief List of all colors that are dynamically given to the title given.
 * Type: { [key: number]: string; }
 */
const Colors = {
     0: "text-red-500 border-b-4 border-red-500",
     1: "text-green-500 border-b-4 border-green-500",
     2: "text-blue-500 border-b-4 border-blue-500",
     3: "text-yellow-500 border-b-4 border-yellow-500",
     4: "text-purple-500 border-b-4 border-purple-500",
     5: "text-orange-500 border-b-4 border-orange-500",
     6: "text-pink-500 border-b-4 border-pink-500",
     7: "text-teal-500 border-b-4 border-teal-500",
     8: "text-indigo-500 border-b-4 border-indigo-500",
     9: "text-lime-500 border-b-4 border-lime-500",
    10: "text-cyan-500 border-b-4 border-cyan-500",
    11: "text-gray-500 border-b-4 border-gray-500",
} as {
    [key: number]: string;
}

const Title = ({ title }: { title: string }) => {
  const titleSplitted: string[] = title.split("");

  return (
    <header className="w-full mb-8 text-center">
      <h1 className="text-5xl font-bold text-center bg-white border border-gray-400 p-4 rounded-md shadow-md font-patrick-hand">
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
