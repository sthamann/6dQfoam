import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Info, Layers, Sparkles, Orbit, Atom, Zap, Telescope, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

// Animated quantum foam visualization component
function QuantumFoamVisualization() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);
  
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
      }));
      setParticles(newParticles);
    };
    
    generateParticles();
    const interval = setInterval(generateParticles, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-cyan-400"
            style={{
              width: particle.size,
              height: particle.size,
            }}
            initial={{ 
              x: `${particle.x}%`, 
              y: `${particle.y}%`, 
              opacity: 0 
            }}
            animate={{ 
              x: `${(particle.x + 20) % 100}%`, 
              y: `${(particle.y + 20) % 100}%`, 
              opacity: [0, 1, 0] 
            }}
            transition={{ 
              duration: 3,
              ease: "easeInOut",
              repeat: Infinity 
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="text-cyan-400 text-6xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360] 
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "linear" 
          }}
        >
          <Sparkles className="w-20 h-20" />
        </motion.div>
      </div>
    </div>
  );
}

// Dimensional comparison visualization
function DimensionalComparison() {
  const [selectedDimension, setSelectedDimension] = useState(6);
  
  const dimensions = [
    { d: 4, name: "Standard 4D", description: "Our familiar spacetime", color: "bg-gray-500" },
    { d: 5, name: "Kaluza-Klein", description: "Single extra dimension", color: "bg-blue-500" },
    { d: 6, name: "Quantum Foam 6D", description: "Optimal for unification", color: "bg-purple-500" },
    { d: 10, name: "String Theory", description: "Superstring requirements", color: "bg-green-500" },
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {dimensions.map((dim) => (
          <motion.div
            key={dim.d}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedDimension(dim.d)}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
              selectedDimension === dim.d 
                ? "border-cyan-400 bg-carbon-800" 
                : "border-carbon-600 bg-carbon-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${dim.color} rounded-full flex items-center justify-center text-white font-bold`}>
                {dim.d}D
              </div>
              <div>
                <h4 className="font-semibold text-carbon-10">{dim.name}</h4>
                <p className="text-xs text-carbon-40">{dim.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDimension}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-4 p-4 bg-carbon-800 rounded-lg"
        >
          {selectedDimension === 6 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-cyan-400">Why 6 Dimensions?</h4>
              <ul className="text-sm text-carbon-20 space-y-1">
                <li>• Minimum for non-Abelian gauge symmetries</li>
                <li>• Natural hierarchy problem solution</li>
                <li>• Self-tuning cosmological constant</li>
                <li>• Near-term experimental testability</li>
              </ul>
            </div>
          )}
          {selectedDimension === 4 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-400">Standard 4D Limitations</h4>
              <ul className="text-sm text-carbon-20 space-y-1">
                <li>• Cannot unify forces geometrically</li>
                <li>• Hierarchy problem unsolved</li>
                <li>• Fine-tuning required</li>
                <li>• No quantum gravity framework</li>
              </ul>
            </div>
          )}
          {selectedDimension === 10 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-green-400">String Theory Challenges</h4>
              <ul className="text-sm text-carbon-20 space-y-1">
                <li>• Requires supersymmetry</li>
                <li>• 10^500 possible vacua</li>
                <li>• Planck-scale effects only</li>
                <li>• Limited testability</li>
              </ul>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Timeline of predictions
function PredictionTimeline() {
  const predictions = [
    { year: "2024-2030", title: "Immediate Tests", items: ["Sub-mm gravity", "LHC missing energy", "GW echoes"], color: "from-cyan-600 to-blue-600" },
    { year: "2030-2040", title: "Medium-term Tests", items: ["100 TeV collider", "LISA detector", "CMB precision"], color: "from-purple-600 to-pink-600" },
    { year: "2040+", title: "Long-term Tests", items: ["Direct imaging", "Dark matter", "Neutrino background"], color: "from-orange-600 to-red-600" },
  ];
  
  return (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 to-purple-400"></div>
      <div className="space-y-8">
        {predictions.map((period, index) => (
          <motion.div
            key={period.year}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className="flex gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-carbon-800 border-2 border-cyan-400 flex items-center justify-center">
                <Telescope className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <Card className="flex-1 bg-carbon-800 border-carbon-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg bg-gradient-to-r ${period.color} bg-clip-text text-transparent`}>
                    {period.title}
                  </CardTitle>
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                    {period.year}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-carbon-20 space-y-1">
                  {period.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function TheoryOverview() {
  const [activeSection, setActiveSection] = useState(0);
  
  const sections = [
    { id: 0, title: "Core Concept", icon: <Atom /> },
    { id: 1, title: "Dimensions", icon: <Layers /> },
    { id: 2, title: "Quantum Foam", icon: <Sparkles /> },
    { id: 3, title: "Predictions", icon: <FlaskConical /> },
  ];
  
  return (
    <div className="h-full bg-carbon-900 overflow-y-auto">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-br from-purple-900/20 via-carbon-900 to-blue-900/20 p-12"
      >
        <div className="max-w-6xl mx-auto">
          <motion.h1 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-4"
          >
            The Quantum Foam 6D Universe Theory
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-carbon-20 max-w-3xl"
          >
            A revolutionary framework unifying quantum mechanics and gravity through minimal extra dimensions 
            and quantum foam, making testable predictions for near-term experiments.
          </motion.p>
        </div>
      </motion.div>
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Navigation Pills */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {sections.map((section) => (
            <motion.button
              key={section.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                activeSection === section.id
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white"
                  : "bg-carbon-800 text-carbon-20 hover:bg-carbon-700"
              }`}
            >
              {section.icon}
              {section.title}
            </motion.button>
          ))}
        </div>
        
        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {activeSection === 0 && (
            <motion.div
              key="core"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <Card className="bg-carbon-800 border-carbon-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-400">
                    <Orbit className="w-5 h-5" />
                    The Big Picture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-carbon-10 mb-2">What is it?</h4>
                    <p className="text-sm text-carbon-20">
                      Our universe exists as a 4D membrane (brane) floating in a 6D quantum foam bulk. 
                      The extra two spatial dimensions are compact but not invisible—they manifest through 
                      gravity modifications and particle physics.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-carbon-10 mb-2">Key Innovation</h4>
                    <p className="text-sm text-carbon-20">
                      Unlike string theory's 10 dimensions, 6D is the minimum needed for complete unification 
                      while remaining experimentally accessible within this decade.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-purple-600">Testable</Badge>
                    <Badge className="bg-cyan-600">Minimal</Badge>
                    <Badge className="bg-pink-600">Unified</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-carbon-800 border-carbon-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-400">
                    <Zap className="w-5 h-5" />
                    Problems Solved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-carbon-900 rounded-lg">
                      <h5 className="font-semibold text-cyan-400 text-sm">Hierarchy Problem</h5>
                      <p className="text-xs text-carbon-40 mt-1">
                        Large extra dimensions naturally explain why gravity is 10³² times weaker
                      </p>
                    </div>
                    <div className="p-3 bg-carbon-900 rounded-lg">
                      <h5 className="font-semibold text-purple-400 text-sm">Cosmological Constant</h5>
                      <p className="text-xs text-carbon-40 mt-1">
                        Quantum foam cancellations reduce vacuum energy by 120 orders of magnitude
                      </p>
                    </div>
                    <div className="p-3 bg-carbon-900 rounded-lg">
                      <h5 className="font-semibold text-pink-400 text-sm">Force Unification</h5>
                      <p className="text-xs text-carbon-40 mt-1">
                        All forces emerge geometrically from extra-dimensional curvature
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {activeSection === 1 && (
            <motion.div
              key="dimensions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-carbon-800 border-carbon-600 mb-8">
                <CardHeader>
                  <CardTitle className="text-purple-400">Why Exactly 6 Dimensions?</CardTitle>
                </CardHeader>
                <CardContent>
                  <DimensionalComparison />
                </CardContent>
              </Card>
              
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-carbon-800 border-carbon-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-cyan-400">Mathematical Sufficiency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-carbon-20">
                      Two extra dimensions provide enough "room" for SU(3)×SU(2)×U(1) gauge structure
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-carbon-800 border-carbon-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-purple-400">Experimental Accessibility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-carbon-20">
                      Effects visible at sub-millimeter scales and TeV energies
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-carbon-800 border-carbon-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-pink-400">Natural Solutions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-carbon-20">
                      Self-tuning mechanisms for cosmological constant emerge naturally
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
          
          {activeSection === 2 && (
            <motion.div
              key="foam"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <Card className="bg-carbon-800 border-carbon-600">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Quantum Foam Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuantumFoamVisualization />
                  <p className="mt-4 text-sm text-carbon-20">
                    At the Planck scale (10⁻³⁵ m), spacetime isn't smooth but constantly fluctuating 
                    with virtual wormholes and geometry bubbles appearing and disappearing.
                  </p>
                </CardContent>
              </Card>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-carbon-800 border-carbon-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-purple-400">Foam Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span className="text-xs text-carbon-20">Scale: 10⁻³⁵ meters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-xs text-carbon-20">Energy: 10¹⁹ GeV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                      <span className="text-xs text-carbon-20">Topology: Dynamic</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-carbon-800 border-carbon-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-cyan-400">Observable Effects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-carbon-20">Lorentz violation: 10⁻²³</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-carbon-20">Photon dispersion: 10⁻³⁸</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-pink-400" />
                      <span className="text-xs text-carbon-20">GW echoes: 0.1%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
          
          {activeSection === 3 && (
            <motion.div
              key="predictions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-carbon-800 border-carbon-600 mb-8">
                <CardHeader>
                  <CardTitle className="text-pink-400">Experimental Predictions Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <PredictionTimeline />
                </CardContent>
              </Card>
              
              <Card className="bg-carbon-800 border-carbon-600">
                <CardHeader>
                  <CardTitle className="text-purple-400">Falsifiability Criteria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-900/20 border border-red-600/50 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Theory Killer Tests</h4>
                      <ul className="text-sm text-carbon-20 space-y-1">
                        <li>• No gravity deviation at 1 μm scale</li>
                        <li>• No new physics at 100 TeV</li>
                        <li>• No GW echoes to 0.01% precision</li>
                        <li>• Perfect Lorentz invariance confirmed</li>
                      </ul>
                    </div>
                    <p className="text-sm text-carbon-40">
                      If these tests find nothing by 2035, the theory is falsified.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-carbon-40 mb-4">
            Ready to explore the mathematical framework and run simulations?
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline" 
              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
              onClick={() => window.location.href = "/"}
            >
              Explore Lagrangians
            </Button>
            <Button 
              variant="outline" 
              className="border-purple-400 text-purple-400 hover:bg-purple-400/10"
              onClick={() => window.location.href = "/universe"}
            >
              Visualize 6D Universe
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 