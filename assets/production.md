# Original asset production

All snake images are 32 × 32 transparent straight-alpha pixel art, produced with the provided draw tools. The head's four separately rendered poses use draw-sheet; straight, corner and tapered tail use draw. The mint upper rail, shaded lower rail and small scale markings distinguish the trail. The brighter head has two dark eyes, white highlights and three opening/closing mouth poses. Sprites are rotated at runtime and sampled without smoothing.

The effects were generated at 44.1 kHz stereo with sfx-synth, seed 42, using pluck envelopes. Eat is a 65 ms triangle at 620 Hz, rising to 992 Hz, at −9 dB. Combo is a 95 ms sine at 1240 Hz, rising to 1984 Hz, at −12 dB. Death is a 650 ms saw at 120 Hz, falling to 30 Hz, at −14 dB.

Music was sequenced with music at 120 BPM, 44.1 kHz stereo, seed 42. It repeats over 16 beats (eight seconds). A triangle bass at −24 dB plays half-beat pulses with roots A2, A2, F2, G2 across the four bars. A sine at −28 dB follows an octave-up 0 / 7 / 12 / 7 arpeggio. Both use pluck envelopes, with no reverb tail crossing the loop boundary. The audio render lasts exactly eight seconds.

These files are finished production assets, committed once. No asset-generation tool is needed to build or play Coil.
