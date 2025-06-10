import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSession } from '../contexts/SessionContext';

export default function FoundationEquationDisplay() {
    const { foundationEquation, setFoundationEquation } = useSession();

    const clearFoundation = () => {
        setFoundationEquation(null);
    };

    if (!foundationEquation) {
        return (
            <Card className="bg-carbon-800 border-carbon-700">
                <CardHeader>
                    <CardTitle className="text-cyan-400">Foundation Equation</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-carbon-40 py-8">
                        No foundation equation saved to session
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatCoefficients = (coeffs: number[]) => {
        return coeffs.map((c, i) => `c${i}: ${c.toFixed(6)}`).join(', ');
    };

    const formatLagrangian = (coeffs: number[]) => {
        if (!coeffs || coeffs.length !== 5) return 'Invalid coefficients';
        
        const [c0, c1, c2, c3, c4] = coeffs;
        const operators = ['(∂ₜφ)²', '(∂ₓφ)²', 'φ²', 'F_{μν}²', 'G'];
        
        let lagrangian = 'L = ';
        
        coeffs.forEach((coeff, i) => {
            if (i === 0) {
                // First term - no leading sign
                lagrangian += `${coeff.toFixed(8)} ${operators[i]}`;
            } else {
                // Subsequent terms - proper sign handling
                if (coeff >= 0) {
                    lagrangian += `\n  + ${coeff.toFixed(8)} ${operators[i]}`;
                } else {
                    lagrangian += `\n  − ${Math.abs(coeff).toFixed(8)} ${operators[i]}`;
                }
            }
        });
        
        return lagrangian;
    };

    return (
        <Card className="bg-carbon-800 border-carbon-700">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-cyan-400">Foundation Equation</CardTitle>
                <Button 
                    onClick={clearFoundation}
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                    Clear
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-carbon-40">Fitness</div>
                            <div className="text-lg font-mono text-green-400">
                                {foundationEquation.fitness.toExponential(6)}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-carbon-40">Generation</div>
                            <div className="text-lg font-mono text-blue-400">
                                {foundationEquation.generation}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-sm text-carbon-40 mb-2">Physics Constants</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-carbon-40">δ_c:</span>
                                <div className="font-mono text-cyan-300">
                                    {foundationEquation.delta_c.toExponential(6)}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-carbon-40">δ_α:</span>
                                <div className="font-mono text-cyan-300">
                                    {foundationEquation.delta_alpha.toExponential(6)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-sm text-carbon-40 mb-2">Foundation Lagrangian</div>
                        <div className="bg-carbon-900 p-4 rounded text-sm font-mono text-cyan-300 whitespace-pre-line">
                            {formatLagrangian(foundationEquation.coefficients)}
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-sm text-carbon-40 mb-2">LaTeX-Ready Format</div>
                        <div className="bg-carbon-900 p-3 rounded text-xs font-mono text-gray-400 select-all">
                            {`L = ${foundationEquation.coefficients[0].toFixed(8)}\\,(\\partial_t\\phi)^2
  + ${foundationEquation.coefficients[1].toFixed(8)}\\,(\\partial_x\\phi)^2
  ${foundationEquation.coefficients[2] >= 0 ? '+' : '-'} ${Math.abs(foundationEquation.coefficients[2]).toFixed(8)}\\,\\phi^2
  ${foundationEquation.coefficients[3] >= 0 ? '+' : '-'} ${Math.abs(foundationEquation.coefficients[3]).toFixed(8)}\\,F_{\\mu\\nu}^2
  ${foundationEquation.coefficients[4] >= 0 ? '+' : '-'} ${Math.abs(foundationEquation.coefficients[4]).toFixed(8)}\\,G`}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <Badge 
                            variant={
                                foundationEquation.delta_c < 1e-10 && foundationEquation.delta_alpha < 1e-10 
                                    ? "default" 
                                    : "secondary"
                            }
                            className="bg-cyan-600"
                        >
                            {foundationEquation.delta_c < 1e-10 && foundationEquation.delta_alpha < 1e-10 
                                ? "HIGH PRECISION" 
                                : "STANDARD"}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}