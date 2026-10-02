import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  ChevronRight,
  Flame,
  ArrowRight,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Zap,
  Video,
  SwitchCamera,
  X,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ComponentFoodItem, EvidenceClass, FoodItem, MealType, ClarifyingQuestion, NutritionSource } from '../types/diet';
import { useDiet, getTodayDateString } from '../context/DietContext';
import { preProcessImage } from '../utils/imageProcessor';
import { reconcileFoodComponent, computeAtwaterDiagnostic } from '../lib/nutritionReconciliation';
import { validateAtwaterThermodynamics, autoCalibrateItemToAtwater } from '../utils/atwaterValidator';
import { SAMPLE_MEAL_TEMPLATES, searchUsdaFoods, buildComponentFromUsda } from '../data/usdaDatabase';

interface PhotoLogScreenProps {
  onMealLogged: () => void;
}

const EVIDENCE_LABELS: Record<EvidenceClass, { label: string; desc: string; badgeClass: string }> = {
  visible: {
    label: 'Line-of-Sight',
    desc: 'Directly visible ingredient',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  context_derived: {
    label: 'Context Derived',
    desc: 'Inferred culinary base or recipe structure',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  user_confirmed: {
    label: 'User Confirmed',
    desc: 'Inspected and verified by user',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  unobservable_unknown: {
    label: 'Unobservable / Unknown',
    desc: 'Hidden cooking oils, butter, dressing, or internal voids',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
  },
};

export const PhotoLogScreen: React.FC<PhotoLogScreenProps> = ({ onMealLogged }) => {
  const { addMeal, findFoodMemoryMatch, logMemoryMatch, addToStagedBasket } = useDiet();

  // State
  const [imagePreview, setImagePreview] = useState<string | null>(SAMPLE_MEAL_TEMPLATES[0].imageUrl);
  const [currentBase64, setCurrentBase64] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<string>('');
  const [mealName, setMealName] = useState<string>(SAMPLE_MEAL_TEMPLATES[0].name);
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressiveStatus, setProgressiveStatus] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [nonFoodNotice, setNonFoodNotice] = useState<string | null>(null);
  const [basketToast, setBasketToast] = useState<string | null>(null);

  // Live Camera Viewfinder State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Staged components
  const [components, setComponents] = useState<ComponentFoodItem[]>(() => {
    const t = SAMPLE_MEAL_TEMPLATES[0];
    return t.components.map((c) => {
      const evClass: EvidenceClass = c.evidenceClass === 'unobservable' ? 'unobservable_unknown' : (c.evidenceClass as EvidenceClass);
      const comp = buildComponentFromUsda(c.itemRefId, c.grams, evClass, c.notes)!;
      return {
        ...comp,
        mass: {
          p10: Math.round(c.grams * 0.85),
          p50: c.grams,
          p90: Math.round(c.grams * 1.18),
          unit: 'g' as const,
        },
        nutritionSource: 'USDA' as NutritionSource,
        confidence: 0.95,
      };
    });
  });

  // Information-gain Clarifying Questions
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([
    {
      id: 'q1',
      question: 'How was the salmon prepared in the skillet?',
      impactDescription: 'Cooking oils add unobservable fat calories',
      options: [
        { label: 'Air-fried / dry grilled (0 kcal oil)', calorieDelta: 0, fatDeltaGrams: 0 },
        { label: 'Light oil spray (~40 kcal)', calorieDelta: 40, fatDeltaGrams: 4.5 },
        { label: 'Pan-seared in olive oil (~90 kcal)', calorieDelta: 90, fatDeltaGrams: 10 },
        { label: 'Generous butter & pan sauce (~160 kcal)', calorieDelta: 160, fatDeltaGrams: 18 },
      ],
      selectedOptionIndex: 2,
    },
  ]);

  // Phase 4: Food memory match state
  const [detectedMemoryMatch, setDetectedMemoryMatch] = useState<any | null>(null);

  // Quick manual add state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  // Custom component entry modal
  const [isCustomAddOpen, setIsCustomAddOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customGrams, setCustomGrams] = useState<number>(100);
  const [customCalories, setCustomCalories] = useState<number>(150);
  const [customProtein, setCustomProtein] = useState<number>(10);
  const [customCarbs, setCustomCarbs] = useState<number>(15);
  const [customFat, setCustomFat] = useState<number>(5);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (facingMode = cameraFacing) => {
    stopCameraStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setAnalysisError('Unable to access device camera. Please upload an image instead.');
    }
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCameraStream();

    canvas.toBlob(async (blob) => {
      if (blob) {
        await executeVisionPipeline(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  // Calculate live totals
  const totalCalories = components.reduce((sum, c) => sum + c.calories, 0);
  const totalP10Calories = components.reduce((sum, c) => sum + Math.round((c.calories / (c.mass?.p50 || 1)) * (c.mass?.p10 || c.grams * 0.85)), 0);
  const totalP90Calories = components.reduce((sum, c) => sum + Math.round((c.calories / (c.mass?.p50 || 1)) * (c.mass?.p90 || c.grams * 1.2)), 0);

  const totalProtein = Math.round(components.reduce((sum, c) => sum + c.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(components.reduce((sum, c) => sum + c.carbs, 0) * 10) / 10;
  const totalFat = Math.round(components.reduce((sum, c) => sum + c.fat, 0) * 10) / 10;
  const totalFiber = Math.round(components.reduce((sum, c) => sum + (c.fiber || 0), 0) * 10) / 10;

  // Unobservable unknown check
  const unobservableItems = components.filter((c) => c.evidenceClass === 'unobservable_unknown');
  const hasUnobservableUnknown = unobservableItems.length > 0;

  // Atwater diagnostic check (diagnostic only; canonical calories never overridden)
  const atwaterDiagnostic = computeAtwaterDiagnostic(totalCalories, totalProtein, totalCarbs, totalFat);

  // Thermodynamic Atwater Validation (4P + 4C + 9F) with 10% discrepancy threshold
  const mealAtwaterValidation = validateAtwaterThermodynamics(totalCalories, totalProtein, totalCarbs, totalFat);
  const hasUnreliableComponents = components.some((c) => c.isUnreliable || (c.atwaterValidation?.isUnreliable));
  const isMealEnergyUnreliable = mealAtwaterValidation.isUnreliable || hasUnreliableComponents;

  // Calibration handlers
  const handleCalibrateComponentAtwater = (id: string) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const atwaterKcal = Math.round(c.protein * 4 + c.carbs * 4 + c.fat * 9);
        const val = validateAtwaterThermodynamics(atwaterKcal, c.protein, c.carbs, c.fat);
        return {
          ...c,
          calories: atwaterKcal,
          atwaterValidation: val,
          isUnreliable: false,
        };
      })
    );
  };

  const handleCalibrateAllComponentsAtwater = () => {
    setComponents((prev) =>
      prev.map((c) => {
        const atwaterKcal = Math.round(c.protein * 4 + c.carbs * 4 + c.fat * 9);
        const val = validateAtwaterThermodynamics(atwaterKcal, c.protein, c.carbs, c.fat);
        return {
          ...c,
          calories: atwaterKcal,
          atwaterValidation: val,
          isUnreliable: false,
        };
      })
    );
  };

  // Core Vision Analysis Pipeline
  const executeVisionPipeline = async (fileOrBlob: File | Blob, customContext = userContext) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setNonFoodNotice(null);
    setDetectedMemoryMatch(null);

    try {
      // Step 1: Pre-process image maintaining full meal aspect ratio
      setProgressiveStatus('Pre-processing image (scaling proportionally, ~120KB)...');
      const { base64, dataUrl } = await preProcessImage(fileOrBlob, 800, 0.85);
      setImagePreview(dataUrl);
      setCurrentBase64(base64);

      // Step 2: Query Gemini Vision
      setProgressiveStatus('Deconstructing meal with Gemini Multimodal Vision...');
      const response = await fetch('/api/recognize-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: 'image/jpeg',
          userContext: customContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const data = await response.json();

      // Check if image is non-food
      if (data.isFood === false) {
        setNonFoodNotice(data.message || 'No clear meal detected in photo. Please ensure camera is centered on your food plate with clear lighting.');
        setProgressiveStatus('Photo did not contain recognized food.');
        return;
      }

      if (!data.success && data.fallbackRequired) {
        setProgressiveStatus('Reconciling against Tier 3 USDA FoodData Central offline engine...');
        loadSampleMeal(SAMPLE_MEAL_TEMPLATES[1]);
        return;
      }

      const predictedName = data.mealName || 'Identified Meal';
      setMealName(predictedName);

      // Phase 4: Check if Personal Food Memory has a high-confidence match
      const memoryMatch = findFoodMemoryMatch(predictedName);
      if (memoryMatch) {
        setDetectedMemoryMatch(memoryMatch);
      }

      // Step 3: Tiered Nutrition Reconciliation
      setProgressiveStatus('Tiered reconciliation: USDA FoodData Central -> Open Food Facts -> Local Curated...');
      const reconciledComponents: ComponentFoodItem[] = [];

      for (const raw of data.components || []) {
        const reconciled = await reconcileFoodComponent({
          name: raw.name,
          estimatedGrams: raw.estimatedGrams || 100,
          p10Grams: raw.p10Grams,
          p90Grams: raw.p90Grams,
          evidenceClass: raw.evidenceClass || 'visible',
          rawCalories: raw.rawCalories,
          rawProtein: raw.rawProtein,
          rawCarbs: raw.rawCarbs,
          rawFat: raw.rawFat,
          rawFiber: raw.rawFiber,
          uncertaintyNote: raw.uncertaintyNote,
        });
        reconciledComponents.push(reconciled);
      }

      if (reconciledComponents.length > 0) {
        setComponents(reconciledComponents);
      }

      if (data.clarifyingQuestions && data.clarifyingQuestions.length > 0) {
        setClarifyingQuestions(data.clarifyingQuestions);
      }

      setProgressiveStatus('Analysis complete. Review and confirm ingredients below.');
    } catch (err: any) {
      console.error('Recognition error:', err);
      setAnalysisError(err.message || 'Vision recognition failed. Switched to manual curation.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-run recognition using current photo with updated context
  const handleReanalyzeWithContext = async () => {
    if (!currentBase64) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setNonFoodNotice(null);

    try {
      setProgressiveStatus('Re-analyzing photo with your context notes...');
      const response = await fetch('/api/recognize-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentBase64,
          mimeType: 'image/jpeg',
          userContext,
        }),
      });

      if (!response.ok) throw new Error(`Server returned error code ${response.status}`);
      const data = await response.json();

      if (data.isFood === false) {
        setNonFoodNotice(data.message);
        return;
      }

      if (data.mealName) setMealName(data.mealName);

      const reconciledComponents: ComponentFoodItem[] = [];
      for (const raw of data.components || []) {
        const reconciled = await reconcileFoodComponent({
          name: raw.name,
          estimatedGrams: raw.estimatedGrams || 100,
          p10Grams: raw.p10Grams,
          p90Grams: raw.p90Grams,
          evidenceClass: raw.evidenceClass || 'visible',
          rawCalories: raw.rawCalories,
          rawProtein: raw.rawProtein,
          rawCarbs: raw.rawCarbs,
          rawFat: raw.rawFat,
          rawFiber: raw.rawFiber,
          uncertaintyNote: raw.uncertaintyNote,
        });
        reconciledComponents.push(reconciled);
      }

      if (reconciledComponents.length > 0) {
        setComponents(reconciledComponents);
      }

      if (data.clarifyingQuestions) {
        setClarifyingQuestions(data.clarifyingQuestions);
      }
      setProgressiveStatus('Updated with context notes.');
    } catch (err: any) {
      setAnalysisError(err.message || 'Re-analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // File Upload Pipeline
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executeVisionPipeline(file);
  };

  // Sample meal loader for instant verification
  const loadSampleMeal = (sample: typeof SAMPLE_MEAL_TEMPLATES[0]) => {
    setMealName(sample.name);
    setMealType(sample.mealType);
    setImagePreview(sample.imageUrl);
    setDetectedMemoryMatch(null);

    const comps: ComponentFoodItem[] = sample.components.map((c) => {
      const evClass: EvidenceClass = c.evidenceClass === 'unobservable' ? 'unobservable_unknown' : (c.evidenceClass as EvidenceClass);
      const comp = buildComponentFromUsda(
        c.itemRefId,
        c.grams,
        evClass,
        c.notes
      )!;
      return {
        ...comp,
        mass: {
          p10: Math.round(c.grams * 0.84),
          p50: c.grams,
          p90: Math.round(c.grams * (c.evidenceClass === 'unobservable' ? 1.35 : 1.18)),
          unit: 'g' as const,
        },
        nutritionSource: 'USDA' as NutritionSource,
        confidence: 0.96,
      };
    });

    setComponents(comps);
  };

  // One-tap re-log for high-confidence personal food memory match
  const handleOneTapMemoryLog = async () => {
    if (!detectedMemoryMatch) return;
    await logMemoryMatch(detectedMemoryMatch, mealType);
    onMealLogged();
  };

  // Add Custom Food Ingredient
  const handleAddCustomComponent = () => {
    if (!customName.trim()) return;
    const newComp: ComponentFoodItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      mass: {
        p10: Math.round(customGrams * 0.85),
        p50: customGrams,
        p90: Math.round(customGrams * 1.2),
        unit: 'g',
      },
      grams: customGrams,
      calories: customCalories,
      protein: customProtein,
      carbs: customCarbs,
      fat: customFat,
      evidenceClass: 'user_confirmed',
      nutritionSource: 'LOCAL_FALLBACK',
      confidence: 1.0,
      uncertaintyNote: 'Custom user-entered ingredient',
    };

    setComponents((prev) => [...prev, newComp]);
    setIsCustomAddOpen(false);
    setCustomName('');
  };

  // Clarifying Question answer handler
  const handleSelectClarifyingOption = (questionId: string, optionIndex: number) => {
    setClarifyingQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, selectedOptionIndex: optionIndex } : q))
    );

    const question = clarifyingQuestions.find((q) => q.id === questionId);
    if (!question) return;
    const option = question.options[optionIndex];
    if (!option) return;

    // Adjust or append hidden oil component
    if (option.calorieDelta !== undefined && option.fatDeltaGrams !== undefined) {
      setComponents((prev) => {
        const existingOil = prev.find((c) => c.name.toLowerCase().includes('cooking oil') || c.name.toLowerCase().includes('sauté oil'));
        if (existingOil) {
          return prev.map((c) => {
            if (c.id === existingOil.id) {
              return {
                ...c,
                calories: Math.max(0, option.calorieDelta ?? 0),
                fat: Math.max(0, option.fatDeltaGrams ?? 0),
                grams: Math.round((option.fatDeltaGrams ?? 0) * 1.1) || 5,
                evidenceClass: 'user_confirmed',
              };
            }
            return c;
          });
        } else if ((option.calorieDelta ?? 0) > 0) {
          const newOil: ComponentFoodItem = {
            id: `oil-${Date.now()}`,
            name: 'Cooking Oil / Sauté Fat',
            mass: { p10: 5, p50: 10, p90: 15, unit: 'g' },
            grams: Math.round((option.fatDeltaGrams ?? 0) * 1.1) || 10,
            calories: option.calorieDelta ?? 0,
            protein: 0,
            carbs: 0,
            fat: option.fatDeltaGrams ?? 0,
            evidenceClass: 'user_confirmed',
            nutritionSource: 'LOCAL_FALLBACK',
            confidence: 0.95,
          };
          return [...prev, newOil];
        }
        return prev;
      });
    }
  };

  // Gram adjustments
  const handleUpdateGrams = (id: string, newGrams: number) => {
    const safeGrams = Math.max(1, newGrams);
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const ratio = safeGrams / (c.grams || 1);
        return {
          ...c,
          grams: safeGrams,
          calories: Math.round(c.calories * ratio),
          protein: Math.round(c.protein * ratio * 10) / 10,
          carbs: Math.round(c.carbs * ratio * 10) / 10,
          fat: Math.round(c.fat * ratio * 10) / 10,
          evidenceClass: 'user_confirmed', // upgraded upon user edit
        };
      })
    );
  };

  // Cycle evidence classification
  const handleToggleEvidence = (id: string) => {
    const cycle: EvidenceClass[] = ['visible', 'context_derived', 'user_confirmed', 'unobservable_unknown'];
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const currentIdx = cycle.indexOf(c.evidenceClass);
        const nextClass = cycle[(currentIdx + 1) % cycle.length];
        return { ...c, evidenceClass: nextClass };
      })
    );
  };

  // Confirm meal into daily diary
  const handleConfirmMeal = async () => {
    if (components.length === 0) return;

    const newFoodItem: FoodItem = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: mealName.trim() || 'Logged Meal',
      mealType,
      calories: totalCalories,
      minCalories: totalP10Calories,
      maxCalories: totalP90Calories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      fiber: totalFiber,
      evidenceClassCounts: {
        visible: components.filter((c) => c.evidenceClass === 'visible').length,
        context_derived: components.filter((c) => c.evidenceClass === 'context_derived').length,
        user_confirmed: components.filter((c) => c.evidenceClass === 'user_confirmed').length,
        unobservable_unknown: components.filter((c) => c.evidenceClass === 'unobservable_unknown').length,
      },
      hasUnobservableUnknown,
      nutritionSource: components[0]?.nutritionSource || 'USDA',
      confidence: 0.94,
      foods: components,
      clarifyingQuestions,
      atwaterDiagnostic,
      atwaterValidation: mealAtwaterValidation,
      isUnreliable: isMealEnergyUnreliable,
      imageUrl: imagePreview || undefined,
      timestamp: Date.now(),
      date: getTodayDateString(),
    };

    await addMeal(newFoodItem);
    onMealLogged();
  };

  const usdaSearchResults = searchUsdaFoods(searchQuery);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Photo Capture & Upload Box */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Camera className="w-4.5 h-4.5" />
              </div>
              Capture or Upload Meal Photo
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Gemini vision detects food items, checks USDA FoodData Central, and flags unobservable cooking oils.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isCameraActive ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startCamera()}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <Video className="w-4 h-4 text-emerald-600" />
                Live Camera
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopCameraStream}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                Close Camera
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload Meal
            </motion.button>
            <input
              id="photo-file-upload-input"
              name="photoFile"
              aria-label="Upload meal photo file"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Live Camera Viewfinder Overlay */}
        <AnimatePresence>
          {isCameraActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/80 shadow-lg"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 sm:h-80 object-cover"
              />
              {/* Viewfinder Circular Plate Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-2 border-white/60 border-dashed animate-pulse flex items-center justify-center">
                  <span className="text-[10px] text-white/95 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full font-medium">
                    Center food plate inside ring
                  </span>
                </div>
              </div>

              {/* Viewfinder Controls Bar */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 px-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleCameraFacing}
                  className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer"
                  title="Switch Camera Facing Mode"
                >
                  <SwitchCamera className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCaptureFromCamera}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg transition-transform flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Snap Photo & Analyze
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Context & Re-analyze Input */}
        <div className="bg-stone-50/80 rounded-2xl p-2.5 border border-stone-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-1">
            <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
            <input
              id="meal-context-note-input"
              name="userContext"
              aria-label="Optional meal context note"
              type="text"
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Optional context note (e.g. 'Ate half', 'Extra olive oil dressing', 'Restaurant takeout')..."
              className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none font-medium"
            />
          </div>
          {currentBase64 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReanalyzeWithContext}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Re-analyze
            </motion.button>
          )}
        </div>

        {/* Live Sample Bar for quick testing without files */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-stone-400 font-medium">Or test with curated photo meals:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SAMPLE_MEAL_TEMPLATES.map((sample, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => loadSampleMeal(sample)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  mealName === sample.name
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                    : 'bg-stone-50/80 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                }`}
              >
                {sample.name.split(' ')[0]} {sample.name.split(' ')[1]}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Progressive Analysis Feedback */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex items-center gap-3"
            >
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-950 block">Analyzing Meal Photo</span>
                <span className="text-emerald-700">{progressiveStatus}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {nonFoodNotice && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Non-Food Image Detected</span>
              <span className="text-amber-800">{nonFoodNotice}</span>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Phase 4: High-Confidence Food Memory Match Notification */}
        {detectedMemoryMatch && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-950">
                  Past Confirmed Meal Match Detected!
                </div>
                <div className="text-[11px] text-blue-700">
                  "{detectedMemoryMatch.name}" has been confirmed {detectedMemoryMatch.confirmedCount} times previously ({detectedMemoryMatch.calories} kcal).
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOneTapMemoryLog}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              ⚡ One-Tap Re-Log ({detectedMemoryMatch.calories} kcal)
            </motion.button>
          </motion.div>
        )}
      </motion.section>

      {/* Main Review & Edit Card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.05 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        {/* Title, Meal Type, and Image Preview */}
        <div className="flex flex-col sm:flex-row gap-5 pb-6 border-b border-stone-100">
          {imagePreview && (
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="shrink-0"
            >
              <img
                src={imagePreview}
                alt="Meal preview"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-white/80 shadow-md shadow-stone-900/5"
              />
            </motion.div>
          )}

          <div className="flex-1 space-y-3">
            <div>
              <label htmlFor="photo-meal-name-input" className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider block mb-1">
                Meal Name
              </label>
              <input
                id="photo-meal-name-input"
                name="mealName"
                aria-label="Meal Name"
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full text-lg font-bold font-display text-stone-900 bg-stone-50/80 border border-stone-200/90 rounded-2xl px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">Meal Type:</span>
              <div className="flex items-center gap-1 bg-stone-100/70 p-1 rounded-xl">
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((t) => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMealType(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mealType === t
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Information-Gain Clarifying Questions (Phase 2 Requirement) */}
        {clarifyingQuestions.length > 0 && (
          <div className="p-4.5 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-850">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              Information-Gain Clarification (Refines Estimate)
            </div>

            {clarifyingQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <div className="text-xs font-medium text-stone-700">
                  {q.question}{' '}
                  <span className="text-[11px] text-stone-400 font-normal italic">
                    ({q.impactDescription})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {q.options.map((opt, optIdx) => (
                    <motion.button
                      key={optIdx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectClarifyingOption(q.id, optIdx)}
                      className={`text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        q.selectedOptionIndex === optIdx
                          ? 'bg-white border-emerald-500 text-emerald-950 shadow-xs font-semibold ring-1 ring-emerald-500/30'
                          : 'bg-white/60 border-stone-200/90 text-stone-600 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.label}</span>
                        {q.selectedOptionIndex === optIdx && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mass Distribution & Unobservable Uncertainty Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Volumetric Mass Confidence Bounds */}
          <div className="p-4.5 rounded-2xl bg-stone-50/90 border border-stone-200 space-y-1">
            <span className="text-[11px] font-mono text-stone-400 uppercase font-bold block">
              Mass & Energy Distribution
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-stone-900">
                {totalCalories} kcal
              </span>
              <span className="text-xs font-mono text-stone-500">
                [p10: {totalP10Calories} – p90: {totalP90Calories} kcal]
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Empirical variance interval accounting for food thickness, sauce absorption, and ingredient void space.
            </p>
          </div>

          {/* Unobservable Unknown Warning Indicator */}
          <div className={`p-4.5 rounded-2xl border space-y-1 ${
            hasUnobservableUnknown ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <span className="text-[11px] font-mono uppercase font-bold flex items-center gap-1.5">
              {hasUnobservableUnknown ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-700">Unobservable Fat Detected</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">All Visible Ingredients</span>
                </>
              )}
            </span>
            <div className="text-xs font-medium">
              {hasUnobservableUnknown
                ? `${unobservableItems.length} ingredient marked unobservable/unknown (pan sauté oils or dressing). Included in distribution.`
                : 'No unobservable cooking fats detected. Line-of-sight confidence is high.'}
            </div>
          </div>
        </div>

        {/* Thermodynamic Atwater Validation Alert (if Discrepancy > 10%) */}
        {isMealEnergyUnreliable && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-xs space-y-2 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold text-amber-950">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Thermodynamic Energy Warning: {mealAtwaterValidation.discrepancyPercentage}% Discrepancy
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCalibrateAllComponentsAtwater}
                className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs transition-all self-start sm:self-auto"
              >
                ⚡ Auto-Calibrate All to Atwater ({mealAtwaterValidation.atwaterCalories} kcal)
              </motion.button>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Reported energy ({totalCalories} kcal) differs by {mealAtwaterValidation.discrepancyPercentage}% from macronutrient fuel factors 4*Protein + 4*Carbs + 9*Fat ({mealAtwaterValidation.atwaterCalories} kcal). This exceeds the 10% tolerance threshold and is flagged as unreliable.
            </p>
          </motion.div>
        )}

        {/* Per-Component Editable Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-display text-stone-900">
              Identified Food Components ({components.length})
            </h3>
            <span className="text-[11px] text-stone-400">
              Click badge to cycle evidence · Edit grams to adjust
            </span>
          </div>

          <div className="space-y-2.5">
            {components.map((comp) => {
              const ev = EVIDENCE_LABELS[comp.evidenceClass] || EVIDENCE_LABELS.visible;
              const atwaterVal = comp.atwaterValidation || validateAtwaterThermodynamics(comp.calories, comp.protein, comp.carbs, comp.fat);
              const isUnreliable = comp.isUnreliable || atwaterVal.isUnreliable;

              return (
                <motion.div
                  key={comp.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isUnreliable
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                      : 'bg-stone-50/80 border-stone-200/90 hover:border-stone-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-900 truncate">
                        {comp.name}
                      </span>
                      <button
                        onClick={() => handleToggleEvidence(comp.id)}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border cursor-pointer font-medium ${ev.badgeClass}`}
                        title="Click to toggle evidence class"
                      >
                        {ev.label}
                      </button>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {comp.nutritionSource}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 font-mono flex-wrap">
                      <span className={`font-bold ${isUnreliable ? 'text-amber-900' : 'text-stone-850'}`}>
                        {comp.calories} kcal
                      </span>
                      {isUnreliable && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 font-sans font-semibold">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Unreliable ({atwaterVal.discrepancyPercentage}%)
                        </span>
                      )}
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="text-blue-600 font-semibold">{comp.protein}g P</span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="text-amber-600 font-semibold">{comp.carbs}g C</span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="text-rose-600 font-semibold">{comp.fat}g F</span>
                    </div>

                    {isUnreliable && (
                      <div className="flex items-center justify-between gap-2 mt-2 p-2 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate">
                            Atwater 4P+4C+9F: <strong>{atwaterVal.atwaterCalories} kcal</strong> ({atwaterVal.discrepancyPercentage}% discrepancy)
                          </span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCalibrateComponentAtwater(comp.id)}
                          className="shrink-0 text-[10px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                          title="Calibrate energy to Atwater formula"
                        >
                          ⚡ Calibrate to {atwaterVal.atwaterCalories} kcal
                        </motion.button>
                      </div>
                    )}

                    {/* Visual Portion Reference & Quick Adjuster Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      {comp.referencePortionBenchmark && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                          Visual ref: {comp.referencePortionBenchmark}
                        </span>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleUpdateGrams(comp.id, Math.max(5, comp.grams - 25))}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        -25g
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleUpdateGrams(comp.id, comp.grams + 10)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        +10g
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleUpdateGrams(comp.id, comp.grams + 25)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        +25g
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleUpdateGrams(comp.id, Math.round(comp.grams * 1.5))}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        x1.5
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Portion Slider / Grams input */}
                    <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                      <input
                        name="componentGrams"
                        aria-label={`Grams for ${comp.name}`}
                        type="number"
                        value={comp.grams}
                        onChange={(e) => handleUpdateGrams(comp.id, parseInt(e.target.value) || 0)}
                        className="w-14 text-right font-mono text-xs font-bold text-stone-900 focus:outline-none"
                        min="1"
                        max="999"
                      />
                      <span className="text-xs text-stone-400 font-mono">g</span>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setComponents((prev) => prev.filter((c) => c.id !== comp.id))}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove component"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Add Ingredient from USDA database or Custom Food */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setIsAddOpen(!isAddOpen);
                setIsCustomAddOpen(false);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add from USDA Database
            </button>

            <button
              onClick={() => {
                setIsCustomAddOpen(!isCustomAddOpen);
                setIsAddOpen(false);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-stone-500" />
              Add Custom Food
            </button>
          </div>

          {/* Custom Food Creation Box */}
          {isCustomAddOpen && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="text-xs font-bold text-stone-800">Add Custom Ingredient</div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div className="col-span-2">
                  <label htmlFor="photo-custom-name" className="text-[10px] text-stone-400 block">Name</label>
                  <input
                    id="photo-custom-name"
                    name="customFoodName"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Homemade Pesto"
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="photo-custom-grams" className="text-[10px] text-stone-400 block">Grams</label>
                  <input
                    id="photo-custom-grams"
                    name="customFoodGrams"
                    type="number"
                    value={customGrams}
                    onChange={(e) => setCustomGrams(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="photo-custom-calories" className="text-[10px] text-stone-400 block">Calories</label>
                  <input
                    id="photo-custom-calories"
                    name="customFoodCalories"
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="photo-custom-protein" className="text-[10px] text-stone-400 block">Protein (g)</label>
                  <input
                    id="photo-custom-protein"
                    name="customFoodProtein"
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="photo-custom-carbs" className="text-[10px] text-stone-400 block">Carbs (g)</label>
                  <input
                    id="photo-custom-carbs"
                    name="customFoodCarbs"
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="photo-custom-fat" className="text-[10px] text-stone-400 block">Fat (g)</label>
                  <input
                    id="photo-custom-fat"
                    name="customFoodFat"
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsCustomAddOpen(false)}
                  className="px-3 py-1 text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomComponent}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  Save Ingredient
                </button>
              </div>
            </div>
          )}

          {isAddOpen && (
            <div className="mt-3 p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <input
                id="photo-usda-search-input"
                name="usdaSearch"
                aria-label="Search USDA database"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search USDA database (e.g. olive oil, rice, avocado)..."
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-500"
              />

              <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                {usdaSearchResults.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-800">{item.name}</div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {item.caloriesPer100g} kcal/100g · P:{item.proteinPer100g}g C:{item.carbsPer100g}g F:{item.fatPer100g}g
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const comp = buildComponentFromUsda(item.id, 100, 'user_confirmed');
                        if (comp) {
                          setComponents((prev) => [
                            ...prev,
                            {
                              ...comp,
                              mass: { p10: 80, p50: 100, p90: 120, unit: 'g' },
                              nutritionSource: 'USDA',
                              confidence: 0.98,
                            },
                          ]);
                          setIsAddOpen(false);
                          setSearchQuery('');
                        }
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      + Add 100g
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Atwater Diagnostic Note (CANONICAL DATABASE ENERGY PRESERVED) */}
        <div className="p-4 rounded-2xl bg-stone-50/90 border border-stone-200/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-bold text-stone-800">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-stone-500" />
              Atwater Energy Diagnostic Check
            </span>
            <span className="font-mono text-stone-500">
              Database: {atwaterDiagnostic.canonicalCalories} kcal · 4P+4C+9F: {atwaterDiagnostic.atwaterCalculatedCalories} kcal
            </span>
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            {atwaterDiagnostic.diagnosticNote}
          </p>
        </div>

        {/* Toast confirmation for basket */}
        {basketToast && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>{basketToast}</span>
            </div>
            <button onClick={() => setBasketToast(null)} className="text-amber-700 hover:text-amber-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Bottom Confirm Action */}
        <div className="pt-5 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono text-stone-400 uppercase font-bold flex items-center gap-1.5">
              <span>Confirmed Meal Total</span>
              {isMealEnergyUnreliable && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 font-sans font-semibold">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Unreliable ({mealAtwaterValidation.discrepancyPercentage}% variance)
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900">
              {totalCalories} kcal{' '}
              <span className="text-xs font-normal text-stone-500 font-mono">
                (P: {totalProtein}g · C: {totalCarbs}g · F: {totalFat}g)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                components.forEach((c) => addToStagedBasket(c));
                setBasketToast(`Added ${components.length} components to Food Plate Staging Basket! View basket in omnibar below.`);
                setTimeout(() => setBasketToast(null), 4000);
              }}
              disabled={components.length === 0}
              className="flex-1 sm:flex-initial px-4.5 py-3 rounded-2xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all cursor-pointer disabled:opacity-50"
            >
              🧺 Stage on Plate Basket
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirmMeal}
              disabled={components.length === 0}
              className="flex-1 sm:flex-initial px-6.5 py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              Confirm & Log to Diary →
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
