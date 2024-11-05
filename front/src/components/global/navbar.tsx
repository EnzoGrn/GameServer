import Link from "next/link";

const Navbar = () => {
  return (
    <header className="navbar bg-base-100 fixed right-0 left-0 top-0 z-[100] overflow-x-hidden flex flex-col w-full">
      <div className="divider divider-start">
        <Link href="/" className="flex-0 btn btn-ghost text-primary-content gap-2 px-2 text-2xl font-extrabold">
          {"WOOHP"}
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
