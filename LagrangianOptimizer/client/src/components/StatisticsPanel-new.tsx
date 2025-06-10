// High-Information Statistics Panel for Pure Python Worker Pool System
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GAUpdate, Candidate } from "@shared/schema";
import { generateFieldEquationString } from "@shared/physics/fieldEquation";
import { solvedDigits } from "@/lib/physicsAccuracy";
import { kappaToG } from "@shared/lib/physicsAccuracy";
// This sub-component displays a single candidate with full details.
function CandidateCard({
    candidate,
    rank,
}: {
    candidate: Candidate;
    rank: number;
}) {
    const getRankColor = (r: number) => {
        if (r === 1) return "bg-yellow-500";
        if (r === 2) return "bg-gray-400";
        if (r === 3) return "bg-orange-600";
        return "bg-blue-500";
    };

    const getFitnessColor = (fitness: number) => {
        if (fitness < 1e-4) return "text-green-600 font-bold";
        if (fitness < 1e-3) return "text-yellow-600 font-semibold";
        return "text-red-600";
    };

    // Generate the full equation display using shared utility
    const equation = generateFieldEquationString(candidate.coefficients, {
        normalized: true,
        showPhysicalSigns: true,
        precision: 8,
        format: "unicode",
    });

    return (
        <Card
            className="mb-3 border-l-4"
            style={{
                borderLeftColor:
                    getRankColor(rank) === "bg-yellow-500"
                        ? "#eab308"
                        : getRankColor(rank) === "bg-gray-400"
                          ? "#9ca3af"
                          : "#ea580c",
            }}
        >
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <Badge className={getRankColor(rank)} variant="secondary">
                        Rank #{rank}
                    </Badge>
                    <span className={getFitnessColor(candidate.fitness)}>
                        Fitness: {candidate.fitness?.toExponential(3) ?? "N/A"}
                    </span>
                </div>

                <div className="text-sm font-mono bg-gray-50 p-2 rounded mb-2">
                    {equation}
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                    <div>
                        <span className="text-gray-500">Digits (c): </span>
                        {solvedDigits(candidate.delta_c)} / 16
                    </div>
                    <div>
                        <span className="text-gray-500">Digits (α): </span>
                        {solvedDigits(candidate.delta_alpha)} / 16
                    </div>
                    <div>
                        <span className="text-gray-500">Digits (G): </span>
                        {solvedDigits(candidate.delta_g)} / 16
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <strong>Speed of Light:</strong>
                        <br />c ={" "}
                        {typeof candidate.c_model === "string"
                            ? candidate.c_model
                            : (candidate.c_model?.toPrecision(15) ??
                              "N/A")}{" "}
                        m/s
                        <br />
                        <span className="text-gray-600">
                            Δc = {((candidate.delta_c ?? 0) * 100).toExponential(6)}%
                        </span>
                    </div>
                    <div>
                        <strong>Fine Structure:</strong>
                        <br />α ={" "}
                        {typeof candidate.alpha_model === "string"
                            ? candidate.alpha_model
                            : (candidate.alpha_model?.toPrecision(15) ??
                              "N/A")}
                        <br />
                        <span className="text-gray-600">
                            Δα ={" "}
                            {((candidate.delta_alpha ?? 0) * 100).toExponential(6)}%
                        </span>
                    </div>
                    <div>
                        <strong>Newton&nbsp;G:</strong>
                        <br />G = {kappaToG(candidate.g_model!)?.toPrecision(15) ?? "N/A"}
                        <br />{" "}
                        <span className="text-gray-600">
                            ΔG = {((candidate.delta_g ?? 0) * 100).toExponential(6)}%{" "}
                        </span>{" "}
                    </div>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                    Generation: {candidate.generation}
                </div>
            </CardContent>
        </Card>
    );
}

interface StatisticsPanelProps {
    gaUpdate: GAUpdate;
}

export default function StatisticsPanel({ gaUpdate }: StatisticsPanelProps) {
    const {
        generation,
        bestFitness,
        stagnation,
        best,
        topCandidates,
        throughput,
        status,
    } = gaUpdate;

    return (
        <div className="space-y-4">
            {/* Status Overview */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-blue-600">
                                {generation}
                            </div>
                            <div className="text-sm text-gray-600">
                                Generation
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">
                                {bestFitness
                                    ? bestFitness.toExponential(3)
                                    : "N/A"}
                            </div>
                            <div className="text-sm text-gray-600">
                                Best Fitness
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600">
                                {throughput}
                            </div>
                            <div className="text-sm text-gray-600">
                                Evaluations/sec
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                        <Badge
                            variant={
                                status === "running" ? "default" : "secondary"
                            }
                        >
                            {status?.toUpperCase() ?? "UNKNOWN"}
                        </Badge>
                        <span className="text-sm text-gray-600">
                            Stagnation: {stagnation} generations
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Best Candidate Details */}
            {best && (
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-green-700">
                        🏆 Champion Equation
                    </h3>
                    <CandidateCard candidate={best} rank={1} />
                </div>
            )}

            {/* Top Candidates */}
            {topCandidates && topCandidates.length > 1 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">
                        🥇 Elite Population
                    </h3>
                    {topCandidates.slice(1, 5).map((candidate, index) => (
                        <CandidateCard
                            key={`${candidate.generation}-${index}`}
                            candidate={candidate}
                            rank={index + 2}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
