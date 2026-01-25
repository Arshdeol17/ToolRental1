import { Link } from "react-router-dom";
import { Hammer, Leaf, Wrench } from "lucide-react";

export default function Home() {
    return (
        <div className="w-full">
            {/* HERO SECTION */}
            <section className="bg-blue-600 text-white py-28 px-6 text-center">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                        Rent • Lend • Save — All Your Tools in One Place
                    </h1>

                    <p className="text-lg text-blue-100 max-w-3xl mx-auto mb-10">
                        ToolRental connects DIYers, contractors, and hobbyists so you can
                        borrow the gear you need, earn from the gear you own, and keep
                        perfectly good equipment out of landfills.
                    </p>

                    <div className="flex justify-center gap-4">
                        <Link
                            to="/tools"
                            className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-md shadow hover:bg-gray-100 transition"
                        >
                            Browse Tools
                        </Link>

                        <Link
                            to="/register"
                            className="border border-white text-white font-semibold px-6 py-3 rounded-md hover:bg-white hover:text-blue-600 transition"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </section>

            {/* WHY SECTION */}
            <section className="bg-gray-50 py-20">
                <h2 className="text-2xl font-bold text-center mb-12">
                    Why use ToolRental?
                </h2>

                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* CARD 1 */}
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <Hammer className="mx-auto text-blue-600 w-10 h-10 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Save Money</h3>
                        <p className="text-gray-600">
                            Rent only when you need something instead of buying it once and
                            letting it collect dust.
                        </p>
                    </div>

                    {/* CARD 2 */}
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <Wrench className="mx-auto text-blue-600 w-10 h-10 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Earn Extra Cash</h3>
                        <p className="text-gray-600">
                            List idle tools and generate passive income while helping your
                            community.
                        </p>
                    </div>

                    {/* CARD 3 */}
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <Leaf className="mx-auto text-blue-600 w-10 h-10 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Reduce Waste</h3>
                        <p className="text-gray-600">
                            Sharing extends a tool’s life-span and keeps perfectly functional
                            equipment out of landfills.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
