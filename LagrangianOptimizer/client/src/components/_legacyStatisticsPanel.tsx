// Pure Python Worker Pool Statistics Panel
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { GAUpdate, Candidate } from '@shared/schema';
import { useSession } from '../contexts/SessionContext';
import PhysConstHealth from './PhysConstHealth';

// Import centralized physics accuracy calculations
import { cStats, alphaStats, isPhysicallyHealthy, getHealthLevel } from '@/lib/physicsAccuracy';
import { C_TARGET, ALPHA_TARGET } from '@shared/physics/constants';

// This sub-component displays a single candidate with full details.
function CandidateCard({ candidate, rank, onPin }: { candidate: Candidate; rank: number; onPin?: (candidate: Candidate) => void }) {
    const getRankColor = (r: number) => {
        if (r === 1) return 'bg-yellow-500';
        if (r === 2) return 'bg-gray-400';
        if (r === 3) return 'bg-orange-600';
        return 'bg-blue-500';
    };

    // Use standardized physics accuracy calculations
    const { d: cDigits, bar: cAccuracy } = candidate.c_model ? cStats(candidate.c_model) : { d: 0, bar: 0 };
    const { d: alphaDigits, bar: alphaAccuracy } = candidate.alpha_model ? alphaStats(candidate.alpha_model) : { d: 0, bar: 0 };

    const getFitnessColor = (fitness: number) => {
        if (fitness < 1e-8) return 'text-green-600 font-bold';
        if (fitness < 1e-6) return 'text-yellow-600 font-semibold';
        if (fitness < 1e-4) return 'text-blue-600 font-medium';
        return 'text-red-600';
    };

    const getPrecisionIndicator = (candidate: Candidate) => {
        const isHighPrecision = candidate.delta_c < 1e-10 && candidate.delta_alpha < 1e-10;
        return isHighPrecision ? 
            <Badge className="bg-green-500 text-white ml-2">HIGH PRECISION</Badge> :
            <Badge className="bg-yellow-500 text-black ml-2">GOOD</Badge>;
    };

    // Generate the full equation display with all 5 operators
    const operators = ['(∂_tφ)²', '(∂_xφ)²', 'φ²', '(∂_tφ)²φ²', 'F²_μν'];
    const equation = candidate.coefficients
        .map((coeff, idx) => {
            const sign = coeff >= 0 && idx > 0 ? '+' : '';
            return `${sign}${coeff.toPrecision(12)}·${operators[idx]}`;
        })
        .join(' ');

    return (
        <Card className="mb-3 border-l-4" style={{borderLeftColor: getRankColor(rank) === 'bg-yellow-500' ? '#eab308' : getRankColor(rank) === 'bg-gray-400' ? '#9ca3af' : '#ea580c'}}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Badge className={getRankColor(rank)} variant="secondary">
                            Rank #{rank}
                        </Badge>
                        <span className={getFitnessColor(candidate.fitness)}>
                            Fitness: {candidate.fitness?.toExponential(3) ?? 'N/A'}
                        </span>
                        {getPrecisionIndicator(candidate)}
                    </div>
                    {onPin && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onPin(candidate)}
                            className="text-xs"
                        >
                            📌 Pin
                        </Button>
                    )}
                </div>
                
                <div className="text-xs font-mono bg-carbon-700 text-carbon-10 p-2 rounded mb-3">
                    <div className="font-semibold mb-1">Lagrangian:</div>
                    <div className="break-all">L = {equation}</div>
                </div>

                {/* Coefficients Table */}
                <div className="mb-3">
                    <div className="text-xs font-semibold text-carbon-10 mb-1">Coefficients (Full Precision):</div>
                    <div className="grid grid-cols-5 gap-1 text-xs font-mono">
                        {candidate.coefficients.map((coeff, idx) => (
                            <div key={idx} className="bg-carbon-700 p-1 rounded text-center">
                                <div className="text-carbon-40 text-[10px]">{operators[idx]}</div>
                                <div className="text-carbon-10">{coeff.toPrecision(6)}</div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm text-carbon-20">
                    <div>
                        <strong className="text-carbon-10">Speed of Light:</strong><br/>
                        <span className="font-mono text-blue-400">{candidate.c_model?.toPrecision(12) ?? 'N/A'}</span> m/s<br/>
                        <div className="flex items-center gap-2 mt-1">
                            <Progress value={cAccuracy} className="h-2 flex-1" />
                            <span className="text-xs text-carbon-40">{cDigits} digits</span>
                        </div>
                    </div>
                    <div>
                        <strong className="text-carbon-10">Fine Structure:</strong><br/>
                        <span className="font-mono text-blue-400">{candidate.alpha_model?.toPrecision(12) ?? 'N/A'}</span><br/>
                        <div className="flex items-center gap-2 mt-1">
                            <Progress value={alphaAccuracy} className="h-2 flex-1" />
                            <span className="text-xs text-carbon-40">{alphaDigits} digits</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-2 text-xs text-carbon-40">
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
    const { generation, bestFitness, stagnation, best, topCandidates, throughput, status } = gaUpdate;
    const [pinnedEquations, setPinnedEquations] = useState<Candidate[]>([]);
    const { pinnedEquation, setPinnedEquation, setFoundationEquation, saveEquationToSession } = useSession();

    const handlePinEquation = (candidate: Candidate) => {
        // Check if equation is already pinned (by coefficients similarity)
        const isAlreadyPinned = pinnedEquations.some(pinned => 
            JSON.stringify(pinned.coefficients) === JSON.stringify(candidate.coefficients)
        );
        
        if (!isAlreadyPinned) {
            setPinnedEquations(prev => [...prev, candidate]);
        }
    };

    const handleSaveBestToSession = async () => {
        if (best) {
            try {
                await saveEquationToSession(best);
                setPinnedEquation(best);
                setFoundationEquation(best);
                console.log('Best equation saved to session successfully');
            } catch (error) {
                console.error('Failed to save equation to session:', error);
            }
        }
    };

    const handleRemovePinned = (index: number) => {
        setPinnedEquations(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {/* Status Overview */}
            <Card className="bg-carbon-800 border-carbon-700">
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{generation}</div>
                            <div className="text-sm text-carbon-40">Generation</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">
                                {bestFitness ? bestFitness.toExponential(3) : 'N/A'}
                            </div>
                            <div className="text-sm text-carbon-40">Best Fitness</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-400">{throughput}</div>
                            <div className="text-sm text-carbon-40">Evaluations/sec</div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Badge variant={status === 'running' ? 'default' : 'secondary'}>
                                {status?.toUpperCase() ?? 'UNKNOWN'}
                            </Badge>
                            <PhysConstHealth ga={gaUpdate} />
                        </div>
                        <div className="flex items-center gap-4">
                            {best && (
                                <Button 
                                    onClick={handleSaveBestToSession}
                                    size="sm"
                                    variant="outline"
                                    className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                                >
                                    Save Best to Session
                                </Button>
                            )}
                            <span className="text-sm text-carbon-40">
                                Stagnation: {stagnation} generations
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Analysis - Physics Constants */}
            {best && (
                <Card className="bg-carbon-800 border-carbon-700">
                    <CardHeader>
                        <CardTitle className="text-lg text-blue-400">Performance Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {/* Fixed Table Format with proper spacing */}
                        <div className="space-y-3">
                            {/* Table Header */}
                            <div className="grid grid-cols-4 gap-6 text-sm font-semibold text-carbon-10 border-b border-carbon-700 pb-2">
                                <div className="truncate">Constant</div>
                                <div className="text-right truncate">Target</div>
                                <div className="text-right truncate">Current</div>
                                <div className="text-right truncate">Error (%)</div>
                            </div>
                            
                            {/* Speed of Light Row - Fixed Overlapping */}
                            <div className="grid grid-cols-4 gap-6 text-sm items-center">
                                <div className="font-medium text-carbon-10 truncate">
                                    Speed of Light (c)
                                </div>
                                <div className="text-right font-mono text-green-400 text-xs truncate">
                                    {C_TARGET.toFixed(16)} m/s
                                </div>
                                <div className="text-right font-mono text-blue-400 text-xs truncate">
                                    {best.c_model ? best.c_model.toExponential(6) : 'N/A'} m/s
                                </div>
                                <div className="text-right font-mono text-yellow-400 text-xs truncate">
                                    {best.c_model ? 
                                        ((Math.abs(best.c_model - C_TARGET) / C_TARGET) * 100).toFixed(1) + '%'
                                        : 'N/A'}
                                </div>
                            </div>
                            
                            {/* Fine Structure Constant Row - Fixed Overlapping */}
                            <div className="grid grid-cols-4 gap-6 text-sm items-center">
                                <div className="font-medium text-carbon-10 truncate">
                                    Fine Structure (α)
                                </div>
                                <div className="text-right font-mono text-green-400 text-xs truncate">
                                    {ALPHA_TARGET.toFixed(12)}
                                </div>
                                <div className="text-right font-mono text-blue-400 text-xs truncate">
                                    {best.alpha_model ? best.alpha_model.toExponential(6) : 'N/A'}
                                </div>
                                <div className="text-right font-mono text-yellow-400 text-xs truncate">
                                    {best.alpha_model ? 
                                        ((Math.abs(best.alpha_model - ALPHA_TARGET) / ALPHA_TARGET) * 100).toFixed(1) + '%'
                                        : 'N/A'}
                                </div>
                            </div>
                            
                            {/* Physics Constants Precision Progress Bars */}
                            <div className="space-y-4 pt-3">
                                {/* Speed of Light Precision */}
                                <div>
                                    <div className="flex justify-between text-xs text-carbon-40 mb-2">
                                        <span>Speed of Light (c) Precision</span>
                                        <span className={`font-mono ${
                                            (best.delta_c || 1) < 1e-9 ? 'text-green-400' : 
                                            (best.delta_c || 1) < 1e-7 ? 'text-yellow-400' : 
                                            (best.delta_c || 1) < 1e-5 ? 'text-blue-400' : 'text-red-400'
                                        }`}>
                                            {best.c_model ? 
                                                `${(100 - ((Math.abs(best.c_model - C_TARGET) / C_TARGET) * 100)).toFixed(8)}%`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <Progress 
                                        value={best.c_model ? 
                                            Math.max(0, Math.min(100, 100 - ((Math.abs(best.c_model - C_TARGET) / C_TARGET) * 100)))
                                            : 0} 
                                        className="h-2"
                                    />
                                    <div className="text-xs text-carbon-50 mt-1">
                                        Δc = {best.delta_c ? best.delta_c.toExponential(3) : 'N/A'}
                                    </div>
                                </div>
                                
                                {/* Fine Structure Constant Precision */}
                                <div>
                                    <div className="flex justify-between text-xs text-carbon-40 mb-2">
                                        <span>Fine Structure (α) Precision</span>
                                        <span className={`font-mono ${
                                            (best.delta_alpha || 1) < 1e-12 ? 'text-green-400' : 
                                            (best.delta_alpha || 1) < 1e-10 ? 'text-yellow-400' : 
                                            (best.delta_alpha || 1) < 1e-8 ? 'text-blue-400' : 'text-red-400'
                                        }`}>
                                            {best.alpha_model ? 
                                                `${(100 - ((Math.abs(best.alpha_model - ALPHA_TARGET) / ALPHA_TARGET) * 100)).toFixed(12)}%`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <Progress 
                                        value={best.alpha_model ? 
                                            Math.max(0, Math.min(100, 100 - ((Math.abs(best.alpha_model - ALPHA_TARGET) / ALPHA_TARGET) * 100)))
                                            : 0} 
                                        className="h-2"
                                    />
                                    <div className="text-xs text-carbon-50 mt-1">
                                        Δα = {best.delta_alpha ? best.delta_alpha.toExponential(3) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overall Breakthrough Indicator */}
                        <div className="mt-4 pt-4 border-t border-carbon-700">
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-1">
                                    {best.fitness < 1e-9 ? (
                                        <span className="text-green-400">🎯 BREAKTHROUGH ACHIEVED</span>
                                    ) : best.fitness < 1e-7 ? (
                                        <span className="text-yellow-400">⭐ HIGH PRECISION</span>
                                    ) : best.fitness < 1e-5 ? (
                                        <span className="text-blue-400">✓ GOOD PRECISION</span>
                                    ) : (
                                        <span className="text-gray-400">⚡ SEARCHING</span>
                                    )}
                                </div>
                                <div className="text-sm text-carbon-40">
                                    Overall Fitness: {best.fitness?.toExponential(3)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pinned Equations Section */}
            {pinnedEquations.length > 0 && (
                <Card className="bg-purple-900/20 border-purple-500">
                    <CardHeader>
                        <CardTitle className="text-lg text-purple-400">📌 Pinned Equations ({pinnedEquations.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            {pinnedEquations.map((equation, index) => (
                                <div key={index} className="relative">
                                    <CandidateCard candidate={equation} rank={index + 1} />
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleRemovePinned(index)}
                                        className="absolute top-2 right-2 text-xs"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Best Candidate Details */}
            {best && (
                <div>
                    <h3 className="text-lg font-semibold mb-2 text-green-400">Champion Equation</h3>
                    <CandidateCard candidate={best} rank={1} onPin={handlePinEquation} />
                </div>
            )}

            {/* Top Candidates */}
            {topCandidates && topCandidates.length > 1 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">🥇 Elite Population</h3>
                    {topCandidates.slice(1, 5).map((candidate, index) => (
                        <CandidateCard 
                            key={`${candidate.generation}-${index}`} 
                            candidate={candidate} 
                            rank={index + 2}
                            onPin={handlePinEquation}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}