Technical Note – Pipeline and Results Exactly as Implemented in analyse2_fixed.py

Purpose
Search for gravitational-wave echoes predicted by the 6-D quantum-foam model using a matched-filter pipeline that operates at µs accuracy and runs on publicly available O3a strain data for five BBH mergers.

⸻

1 Data Set Handled by the Script

Event ID	H1 file	L1 file	GPS merger (s)	M_1+M_2\;[M_\odot]
GW190412	✔	✔	1239082262.2	38
GW190519_153544	–	✔	1242315362	106
GW190521	✔	✔	1242442967.4	151
GW190602_175927	–	✔	1243533585	121
GW190814	✔	✔	1249852257.0	25.6

Files are 16 kHz GWOSC HDF5 (“O3a_16KHZ_R1”).

⸻

2 Signal Processing Steps (One-to-One with Code)

Step	Exact parameters in script
Window	30 s before/after merger (window_start / window_end).
Whitening	Welch PSD, segment = 4 s, 75 % overlap (robust median).
Band-pass	35 – 350 Hz, 4ᵗʰ-order Butterworth.
Resampling (optional)	resample_poly to 65 536 Hz when higher resolution is needed (not used later in the code path, but kept as helper).
Fractional delay	shift_freq_domain – complex FFT phase rotation, preserves µs delays well below one sample at 16 kHz.
Main signal template	200 ms ring-down slice around merger (±0.2 s).
Echo damping	Fixed amplitude scale damping_factor = 1 × 10⁻³.
Echo delays tested	Exactlypython<br>echo_delays = np.array([<br>    65.7e-6*mass_factor, 71.2e-6*mass_factor,<br>    50e-6, 60e-6, 80e-6, 90e-6, 100e-6<br>])
Mass scaling	mass_factor = (M_total / 60)^⅔ (implements the theory’s M^{2/3} law).
Phase grid	8 equidistant phases np.linspace(0, 2π, 8).
Matched-filter SNR	Normalised correlation; noise σ via Median Absolute Deviation on the first & last 10 % of the correlation array.
Echo window for filtering	±10 ms (window_size = 0.01 s) centred on expected delay; enforced minimum 5 ms of data.
Coincidence criteria	Both H1 & L1 present;time difference < 5 µs.
Trial correction	\rho^\mathrm{corr} = \rho_\mathrm{raw} - \sqrt{\ln N_\mathrm{templates}} with N = 7\,\text{delays} × 8\,\text{phases} = 56.
Detection flag	combined_snr_corrected > 5. 3 < SNR ≤ 5 → “marginal”.


⸻

3 Pipeline Flow (Code Blocks → Logic)

load_gw_data → whiten_data → bandpass_filter
           ↘ (main 200 ms slice)         ↙
     generate_echo_template (56 variants)
             ↓
   matched_filter_echo (per variant)
             ↓
   pick max-SNR per delay → best per detector
             ↓
dual-detector combination + trial correction


⸻

4 Numerical Output Produced by the Script

Event	Best delay H1 (µs)	SNR H1	Best delay L1 (µs)	SNR L1	Δt_{HL} (µs)	\rho_\text{comb}^\text{corr}	Status
GW190521	131.7	3.6	131.7	16.1	0.0	14.5	significant
GW190412	60.0	9.4	100.0	1.7	40.0	7.5	inconsis­tent delay
GW190814	—	0.0	100.0	2.0	—	0.0	not significant
GW190519_153544	—	—	50.0	2.6	—	2.6	single detector only
GW190602_175927	—	—	50.0	2.3	—	2.3	single detector only

![image](https://github.com/user-attachments/assets/8c252c56-65e6-47d6-914d-4176fc46b54d)

⸻

5 How These Results Tie to the 6-D Theory
	•	Theory delay
\Delta t_0 = 71.2\;\mu\text{s} scales with total mass as (M/60)^{2/3}.
For M=151\,M_\odot (GW 190 521) the prediction is 131.7 µs – exactly the delay identified in both detectors.
	•	Phase sampling and fixed damping are placeholders; the physics model supplies only the delay, not the precise phase/amplitude, which is why the grid search is necessary.

⸻

6 What the Script Does Not Yet Do
	•	No time-slide background → false-alarm probability is still analytic.
	•	No Omicron/Gravity-Spy glitch veto.
	•	No Virgo/KAGRA check.
	•	Only first-echo search; higher-order echoes are ignored.

⸻

7 Interpretation at this Stage
	1.	GW190521 passes every hardcoded criterion in the code (delay match, dual-detector coincidence, SNR_\text{corr}>5).
	2.	GW190412 is a strong single-detector outlier but fails the delay-coincidence test.
	3.	Remaining events are below the pipeline’s significance threshold.

Therefore: Given the exact operations of analyse2_fixed.py, GW190521 stands out as a candidate echo fully consistent with the 6-D quantum-foam prediction. All other events are either inconsistent or statistically weak within this specific pipeline.
