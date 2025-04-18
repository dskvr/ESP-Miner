import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { startWith, Subject, takeUntil } from 'rxjs';
import { LoadingService } from 'src/app/services/loading.service';
import { SystemService } from 'src/app/services/system.service';
import { eASICModel } from 'src/models/enum/eASICModel';
import { ActivatedRoute } from '@angular/router';

// Preset interface
interface OverclockPreset {
  name: string;
  frequency: number;
  coreVoltage: number;
  timestamp: number;
  asicModel: eASICModel;
  builtIn?: boolean; // Flag for built-in presets that cannot be deleted
}

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnInit, OnDestroy {

  public form!: FormGroup;

  public firmwareUpdateProgress: number | null = null;
  public websiteUpdateProgress: number | null = null;

  public savedChanges: boolean = false;
  public settingsUnlocked: boolean = false;
  public eASICModel = eASICModel;
  public ASICModel!: eASICModel;
  public restrictedModels: eASICModel[] = Object.values(eASICModel)
    .filter((v): v is eASICModel => typeof v === 'string');

  // Default values for different ASIC models
  public defaultFrequency: { [key in eASICModel]: number } = {
    [eASICModel.BM1366]: 485,
    [eASICModel.BM1368]: 490,
    [eASICModel.BM1370]: 525,
    [eASICModel.BM1397]: 425
  };

  public defaultVoltage: { [key in eASICModel]: number } = {
    [eASICModel.BM1366]: 1200,
    [eASICModel.BM1368]: 1166,
    [eASICModel.BM1370]: 1150,
    [eASICModel.BM1397]: 1300
  };

  // Maximum values for different ASIC models
  public maxFrequency: { [key in eASICModel]: number } = {
    [eASICModel.BM1366]: 650,
    [eASICModel.BM1368]: 650,
    [eASICModel.BM1370]: 925,
    [eASICModel.BM1397]: 675
  };

  public maxVoltage: { [key in eASICModel]: number } = {
    [eASICModel.BM1366]: 1350,
    [eASICModel.BM1368]: 1350,
    [eASICModel.BM1370]: 1350,
    [eASICModel.BM1397]: 1550
  };

  // Minimum values for different ASIC models
  public minFrequency: { [key in eASICModel]: number } = {
    [eASICModel.BM1366]: 200,
    [eASICModel.BM1368]: 200,
    [eASICModel.BM1370]: 200,
    [eASICModel.BM1397]: 200
  };

  public minVoltage: { [key in eASICModel]: number } = {
    [eASICModel.BM1366]: 900,
    [eASICModel.BM1368]: 900,
    [eASICModel.BM1370]: 900,
    [eASICModel.BM1397]: 900
  };

  // Increment options for buttons
  public incrementOptions = [1, 10, 25, 50, 100];
  
  // Get reversed increment options for decrement buttons
  public get reversedIncrementOptions(): number[] {
    return [...this.incrementOptions].reverse();
  }

  // Valid frequencies for each ASIC model
  public validFrequencies: { [key in eASICModel]: number[] } = {
    [eASICModel.BM1366]: [],
    [eASICModel.BM1368]: [],
    [eASICModel.BM1370]: [],
    [eASICModel.BM1397]: []
  };

  // Use a getter for actual frequency instead of a property
  public get actualFrequency(): number {
    if (!this.form?.get('frequency')?.value) {
      return 0;
    }
    return this.calculateActualFrequency(this.form.get('frequency')?.value);
  }

  // Preset management
  public presetName: string = '';
  public presets: OverclockPreset[] = [];
  public showPresetDialog: boolean = false;
  public editingPreset: OverclockPreset | null = null;
  
  @Input() uri = '';

  public BM1397DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '425 (default)', value: 425 },
    { name: '450', value: 450 },
    { name: '475', value: 475 },
    { name: '485', value: 485 },
    { name: '500', value: 500 },
    { name: '525', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
    { name: '590', value: 590 },
    { name: '600', value: 600 },
    { name: '610', value: 610 },
    { name: '620', value: 620 },
    { name: '630', value: 630 },
    { name: '640', value: 640 },
    { name: '650', value: 650 },
  ];

  public BM1366DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '425', value: 425 },
    { name: '450', value: 450 },
    { name: '475', value: 475 },
    { name: '485 (default)', value: 485 },
    { name: '500', value: 500 },
    { name: '525', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
  ];

  public BM1368DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '425', value: 425 },
    { name: '450', value: 450 },
    { name: '475', value: 475 },
    { name: '490 (default)', value: 490 },
    { name: '500', value: 500 },
    { name: '525', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
  ];

  public BM1370DropdownFrequency = [
    { name: '400', value: 400 },
    { name: '490', value: 490 },
    { name: '525 (default)', value: 525 },
    { name: '550', value: 550 },
    { name: '575', value: 575 },
    { name: '596', value: 596 },
    { name: '600', value: 600 },
    { name: '625', value: 625 },
    { name: '650', value: 650 },
    { name: '675', value: 675 },
    { name: '700', value: 700 },
    { name: '725', value: 725 },
    { name: '750', value: 750 },
    { name: '775', value: 775 },
    { name: '800', value: 800 },
    { name: '825', value: 825 },
    { name: '850', value: 850 },
    { name: '875', value: 875 },
    { name: '900', value: 900 },
  ];

  public BM1370CoreVoltage = [
    { name: '1000', value: 1000 },
    { name: '1060', value: 1060 },
    { name: '1100', value: 1100 },
    { name: '1150 (default)', value: 1150 },
    { name: '1200', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1255', value: 1255 },
    { name: '1260', value: 1260 },
    { name: '1265', value: 1265 },
    { name: '1270', value: 1270 },
    { name: '1275', value: 1275 },
    { name: '1280', value: 1280 },
    { name: '1285', value: 1285 },
    { name: '1290', value: 1290 },
    { name: '1295', value: 1295 },
    { name: '1300', value: 1300 }
  ];

  public BM1397CoreVoltage = [
    { name: '1100', value: 1100 },
    { name: '1150', value: 1150 },
    { name: '1200', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1300', value: 1300 },
    { name: '1350', value: 1350 },
    { name: '1400', value: 1400 },
    { name: '1450', value: 1450 },
    { name: '1500', value: 1500 },
  ];
  public BM1366CoreVoltage = [
    { name: '1100', value: 1100 },
    { name: '1150', value: 1150 },
    { name: '1200 (default)', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1300', value: 1300 },
  ];
  public BM1368CoreVoltage = [
    { name: '1100', value: 1100 },
    { name: '1150', value: 1150 },
    { name: '1166 (default)', value: 1166 },
    { name: '1200', value: 1200 },
    { name: '1250', value: 1250 },
    { name: '1300', value: 1300 },
  ];

  private destroy$ = new Subject<void>();

  // Warning acknowledgment
  public warningAcknowledged: boolean = false;
  private readonly STORAGE_KEY_WARNING = 'overclockWarningAcknowledged';

  constructor(
    private fb: FormBuilder,
    private systemService: SystemService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private route: ActivatedRoute,
  ) {
    // Check URL parameter for settings unlock
    this.route.queryParams.subscribe(params => {
      const urlOcParam = params['oc'] !== undefined;
      if (urlOcParam) {
        // If ?oc is in URL, enable overclock and save to NVS
        this.settingsUnlocked = true;
        this.saveOverclockSetting(1);
        console.log(
          '🎉 The ancient seals have been broken!\n' +
          '⚡ Unlimited power flows through your miner...\n' +
          '🔧 You can now set custom frequency and voltage values.\n' +
          '⚠️ Remember: with great power comes great responsibility!'
        );
      } else {
        // If ?oc is not in URL, check NVS setting (will be loaded in ngOnInit)
        console.log('🔒 Here be dragons! Advanced settings are locked for your protection. \n' +
          'Only the bravest miners dare to venture forth... \n' +
          'If you wish to unlock dangerous overclocking powers, add: %c?oc',
          'color: #ff4400; text-decoration: underline; cursor: pointer; font-weight: bold;',
          'to the current URL'
        );
      }
    });
  }

  private saveOverclockSetting(enabled: number) {
    this.systemService.updateSystem(this.uri, { overclockEnabled: enabled })
      .subscribe({
        next: () => {
          console.log(`Overclock setting saved: ${enabled === 1 ? 'enabled' : 'disabled'}`);
        },
        error: (err) => {
          console.error(`Failed to save overclock setting: ${err.message}`);
        }
      });
  }

  ngOnInit(): void {
    // Check if warning has been acknowledged
    this.warningAcknowledged = localStorage.getItem(this.STORAGE_KEY_WARNING) === 'true';

    this.systemService.getInfo(this.uri)
      .pipe(
        this.loadingService.lockUIUntilComplete(),
        takeUntil(this.destroy$)
      )
      .subscribe(info => {
        this.ASICModel = info.ASICModel;

        // Generate valid frequencies for this ASIC model
        this.generateValidFrequencies();

        // Check if overclock is enabled in NVS
        if (info.overclockEnabled === 1) {
          this.settingsUnlocked = true;
          console.log(
            '🎉 Overclock mode is enabled from NVS settings!\n' +
            '⚡ Custom frequency and voltage values are available.'
          );
        }

        this.form = this.fb.group({
          flipscreen: [info.flipscreen == 1],
          invertscreen: [info.invertscreen == 1],
          coreVoltage: [info.coreVoltage, [Validators.required, Validators.min(this.minVoltage[this.ASICModel]), Validators.max(this.maxVoltage[this.ASICModel])]],
          frequency: [info.frequency, [Validators.required, Validators.min(this.minFrequency[this.ASICModel]), Validators.max(this.maxFrequency[this.ASICModel])]],
          autofanspeed: [info.autofanspeed == 1, [Validators.required]],
          invertfanpolarity: [info.invertfanpolarity == 1, [Validators.required]],
          fanspeed: [info.fanspeed, [Validators.required]],
          temptarget: [info.temptarget, [Validators.required]],
          overheat_mode: [info.overheat_mode, [Validators.required]]
        });

        this.form.controls['autofanspeed'].valueChanges.pipe(
          startWith(this.form.controls['autofanspeed'].value),
          takeUntil(this.destroy$)
        ).subscribe(autofanspeed => {
          if (autofanspeed) {
            this.form.controls['fanspeed'].disable();
            this.form.controls['temptarget'].enable();
          } else {
            this.form.controls['fanspeed'].enable();
            this.form.controls['temptarget'].disable();
          }
        });
        
        // Load saved presets
        this.loadPresets();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Generate all valid frequencies for the current ASIC model
   * This pre-calculates all possible frequencies that can be achieved
   */
  generateValidFrequencies(): void {
    const min = this.minFrequency[this.ASICModel];
    const max = this.maxFrequency[this.ASICModel];
    const step = 1; // 1MHz increments for calculation
    
    const frequencies: number[] = [];
    for (let freq = min; freq <= max; freq += step) {
      const actualFreq = this.calculateActualFrequency(freq);
      // Only add if it's a unique value
      if (!frequencies.includes(actualFreq)) {
        frequencies.push(actualFreq);
      }
    }
    
    // Sort ascending
    frequencies.sort((a, b) => a - b);
    this.validFrequencies[this.ASICModel] = frequencies;
    
    console.log(`Generated ${frequencies.length} valid frequencies for ${this.ASICModel}`);
  }

  /**
   * Calculate the actual frequency that will be set for a given target frequency
   * Port of the C function to TypeScript
   */
  calculateActualFrequency(targetFreq: number): number {
    // Each chip model has different calculation methods
    switch (this.ASICModel) {
      case eASICModel.BM1370:
        return this.calculateBM1370Frequency(targetFreq);
      case eASICModel.BM1366:
        return this.calculateBM1366Frequency(targetFreq);
      case eASICModel.BM1368:
        return this.calculateBM1368Frequency(targetFreq);
      case eASICModel.BM1397:
        return this.calculateBM1397Frequency(targetFreq);
      default:
        return targetFreq; // Fallback to original input
    }
  }

  /**
   * Calculate the actual frequency for BM1370 chip
   * Direct port of the C function
   */
  calculateBM1370Frequency(targetFreq: number): number {
    let fbDivider = 0;
    let postDivider1 = 0, postDivider2 = 0;
    let refDivider = 0;
    let minDifference = 10;
    const maxDiff = 1.0;
    let newFreq = 200.0; // default 200MHz

    // refdiver is 2 or 1
    // postdivider 2 is 1 to 7
    // postdivider 1 is 1 to 7 and greater than or equal to postdivider 2
    // fbdiv is 0xa0 to 0xef
    for (let refDivLoop = 2; refDivLoop > 0 && fbDivider === 0; refDivLoop--) {
      for (let postDiv1Loop = 7; postDiv1Loop > 0 && fbDivider === 0; postDiv1Loop--) {
        for (let postDiv2Loop = 7; postDiv2Loop > 0 && fbDivider === 0; postDiv2Loop--) {
          if (postDiv1Loop >= postDiv2Loop) {
            const tempFbDivider = Math.round((postDiv1Loop * postDiv2Loop * targetFreq * refDivLoop) / 25.0);

            if (tempFbDivider >= 0xa0 && tempFbDivider <= 0xef) {
              const tempFreq = 25.0 * tempFbDivider / (refDivLoop * postDiv2Loop * postDiv1Loop);
              const freqDiff = Math.abs(targetFreq - tempFreq);

              if (freqDiff < minDifference && freqDiff < maxDiff) {
                fbDivider = tempFbDivider;
                postDivider1 = postDiv1Loop;
                postDivider2 = postDiv2Loop;
                refDivider = refDivLoop;
                minDifference = freqDiff;
                newFreq = tempFreq;
              }
            }
          }
        }
      }
    }

    if (fbDivider === 0) {
      console.warn(`Failed to find PLL settings for target frequency ${targetFreq.toFixed(2)}`);
      return targetFreq; // Return the target as fallback
    }

    return parseFloat(newFreq.toFixed(2)); // Round to 2 decimal places for display
  }

  /**
   * Calculate the actual frequency for BM1366 chip
   * Direct port of the C function
   */
  calculateBM1366Frequency(targetFreq: number): number {
    let fbDivider = 0;
    let postDivider1 = 0, postDivider2 = 0;
    let refDivider = 0;
    let minDifference = 10;
    let newFreq = 200.0; // default 200MHz

    // refdiver is 2 or 1
    // postdivider 2 is 1 to 7
    // postdivider 1 is 1 to 7 and less than postdivider 2
    // fbdiv is 144 to 235
    for (let refDivLoop = 2; refDivLoop > 0 && fbDivider === 0; refDivLoop--) {
      for (let postDiv1Loop = 7; postDiv1Loop > 0 && fbDivider === 0; postDiv1Loop--) {
        for (let postDiv2Loop = 1; postDiv2Loop < postDiv1Loop && fbDivider === 0; postDiv2Loop++) {
          const tempFbDivider = Math.round((postDiv1Loop * postDiv2Loop * targetFreq * refDivLoop) / 25.0);

          if (tempFbDivider >= 144 && tempFbDivider <= 235) {
            const tempFreq = 25.0 * tempFbDivider / (refDivLoop * postDiv2Loop * postDiv1Loop);
            const freqDiff = Math.abs(targetFreq - tempFreq);

            if (freqDiff < minDifference) {
              fbDivider = tempFbDivider;
              postDivider1 = postDiv1Loop;
              postDivider2 = postDiv2Loop;
              refDivider = refDivLoop;
              minDifference = freqDiff;
              newFreq = tempFreq;
              break;
            }
          }
        }
      }
    }

    if (fbDivider === 0) {
      console.warn(`Failed to find PLL settings for target frequency ${targetFreq.toFixed(2)}, using default (200MHz)`);
      return 200.0;
    }

    return parseFloat(newFreq.toFixed(2)); // Round to 2 decimal places for display
  }

  /**
   * Calculate the actual frequency for BM1368 chip
   * Direct port of the C function
   */
  calculateBM1368Frequency(targetFreq: number): number {
    const maxDiff = 0.001;
    let postdivMin = 255;
    let postdiv2Min = 255;
    let bestFreq = 0;
    let bestRefDiv = 0, bestFbDiv = 0, bestPostDiv1 = 0, bestPostDiv2 = 0;
    let found = false;

    for (let refDiv = 2; refDiv > 0; refDiv--) {
      for (let postDiv1 = 7; postDiv1 > 0; postDiv1--) {
        for (let postDiv2 = 7; postDiv2 > 0; postDiv2--) {
          const fbDivider = Math.round(targetFreq / 25.0 * (refDiv * postDiv2 * postDiv1));
          const newFreq = 25.0 * fbDivider / (refDiv * postDiv2 * postDiv1);

          if (fbDivider >= 144 && fbDivider <= 235 &&
              Math.abs(targetFreq - newFreq) < maxDiff &&
              postDiv1 >= postDiv2 &&
              postDiv1 * postDiv2 < postdivMin &&
              postDiv2 <= postdiv2Min) {

            postdiv2Min = postDiv2;
            postdivMin = postDiv1 * postDiv2;
            bestFreq = newFreq;
            bestRefDiv = refDiv;
            bestFbDiv = fbDivider;
            bestPostDiv1 = postDiv1;
            bestPostDiv2 = postDiv2;
            found = true;
          }
        }
      }
    }

    if (!found) {
      console.warn(`Didn't find PLL settings for target frequency ${targetFreq.toFixed(2)}`);
      return targetFreq; // Return the target as fallback
    }

    return parseFloat(bestFreq.toFixed(2)); // Round to 2 decimal places for display
  }

  /**
   * Calculate the actual frequency for BM1397 chip
   * Direct port of the C function
   */
  calculateBM1397Frequency(targetFreq: number): number {
    const FREQ_MULT = 25.0;
    const defFreq = 200.0;
    
    // Limit frequency range
    let f1 = targetFreq;
    if (f1 < 50) {
      f1 = 50;
    } else if (f1 > 650) {
      f1 = 650;
    }

    let fb = 2;
    let fc1 = 1;
    let fc2 = 5; // initial multiplier of 10
    
    if (f1 >= 500) {
      // halve down to '250-400'
      fb = 1;
    } else if (f1 <= 150) {
      // triple up to '300-450'
      fc1 = 3;
    } else if (f1 <= 250) {
      // double up to '300-500'
      fc1 = 2;
    }
    // else f1 is 250-500

    // f1 * fb * fc1 * fc2 is between 2500 and 6500
    // - so round up to the next 25 (FREQ_MULT)
    const baseFreq = FREQ_MULT * Math.ceil(f1 * fb * fc1 * fc2 / FREQ_MULT);

    // fa should be between 0x10 (16) and 0x104 (260)
    const fa = baseFreq / FREQ_MULT;
    const faMin = 0x10;
    const faMax = 0x104;

    // code failure ... baseFreq isn't 400 to 6000
    if (fa < faMin || fa > faMax) {
      return defFreq;
    } else {
      const newFreq = baseFreq / (fb * fc1 * fc2);
      return parseFloat(newFreq.toFixed(2)); // Round to 2 decimal places for display
    }
  }

  /**
   * Find the next valid frequency in the sequence
   */
  findNextValidFrequency(current: number, increment: boolean): number {
    const validFreqs = this.validFrequencies[this.ASICModel];
    if (!validFreqs || validFreqs.length === 0) {
      // If no valid frequencies calculated, fall back to the original behavior
      return increment ? current + 1 : current - 1;
    }
    
    // Find the nearest valid frequency that's greater/less than current
    if (increment) {
      const next = validFreqs.find(freq => freq > current);
      return next !== undefined ? next : current;
    } else {
      // Find largest frequency less than current
      const prev = [...validFreqs].reverse().find(freq => freq < current);
      return prev !== undefined ? prev : current;
    }
  }

  public updateSystem() {

    const form = this.form.getRawValue();

    if (form.stratumPassword === '*****') {
      delete form.stratumPassword;
    }

    this.systemService.updateSystem(this.uri, form)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: () => {
          const successMessage = this.uri ? `Saved settings for ${this.uri}` : 'Saved settings';
          this.toastr.success(successMessage, 'Success!');
          this.savedChanges = true;
        },
        error: (err: HttpErrorResponse) => {
          const errorMessage = this.uri ? `Could not save settings for ${this.uri}. ${err.message}` : `Could not save settings. ${err.message}`;
          this.toastr.error(errorMessage, 'Error');
          this.savedChanges = false;
        }
      });
  }

  showWifiPassword: boolean = false;
  toggleWifiPasswordVisibility() {
    this.showWifiPassword = !this.showWifiPassword;
  }

  disableOverheatMode() {
    this.form.patchValue({ overheat_mode: 0 });
    this.updateSystem();
  }

  toggleOverclockMode(enable: boolean) {
    this.settingsUnlocked = enable;
    this.saveOverclockSetting(enable ? 1 : 0);

    if (enable) {
      console.log(
        '🎉 Overclock mode enabled!\n' +
        '⚡ Custom frequency and voltage values are now available.'
      );
    } else {
      console.log('🔒 Overclock mode disabled. Using safe preset values only.');
    }
  }

  public restart() {
    this.systemService.restart(this.uri)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: () => {
          const successMessage = this.uri ? `Bitaxe at ${this.uri} restarted` : 'Bitaxe restarted';
          this.toastr.success(successMessage, 'Success');
        },
        error: (err: HttpErrorResponse) => {
          const errorMessage = this.uri ? `Failed to restart device at ${this.uri}. ${err.message}` : `Failed to restart device. ${err.message}`;
          this.toastr.error(errorMessage, 'Error');
        }
      });
  }

  getDropdownFrequency() {
    // Get base frequency options based on ASIC model
    let options = [];
    switch(this.ASICModel) {
        case this.eASICModel.BM1366: options = [...this.BM1366DropdownFrequency]; break;
        case this.eASICModel.BM1368: options = [...this.BM1368DropdownFrequency]; break;
        case this.eASICModel.BM1370: options = [...this.BM1370DropdownFrequency]; break;
        case this.eASICModel.BM1397: options = [...this.BM1397DropdownFrequency]; break;
        default: return [];
    }

    // Get current frequency value from form
    const currentFreq = this.form?.get('frequency')?.value;

    // If current frequency exists and isn't in the options
    if (currentFreq && !options.some(opt => opt.value === currentFreq)) {
        options.push({
            name: `${currentFreq} (Custom)`,
            value: currentFreq
        });
        // Sort options by frequency value
        options.sort((a, b) => a.value - b.value);
    }

    return options;
  }

  getCoreVoltage() {
    // Get base voltage options based on ASIC model
    let options = [];
    switch(this.ASICModel) {
        case this.eASICModel.BM1366: options = [...this.BM1366CoreVoltage]; break;
        case this.eASICModel.BM1368: options = [...this.BM1368CoreVoltage]; break;
        case this.eASICModel.BM1370: options = [...this.BM1370CoreVoltage]; break;
        case this.eASICModel.BM1397: options = [...this.BM1397CoreVoltage]; break;
        default: return [];
    }

    // Get current voltage value from form
    const currentVoltage = this.form?.get('coreVoltage')?.value;

    // If current voltage exists and isn't in the options
    if (currentVoltage && !options.some(opt => opt.value === currentVoltage)) {
        options.push({
            name: `${currentVoltage} (Custom)`,
            value: currentVoltage
        });
        // Sort options by voltage value
        options.sort((a, b) => a.value - b.value);
    }

    return options;
  }

  // Modified to use valid frequencies
  incrementValue(controlName: string, amount: number): void {
    const control = this.form.get(controlName);
    if (!control) return;
    
    let currentValue = control.value || 0;
    let newValue;
    
    if (controlName === 'frequency') {
      // For frequency, find the next valid frequency in the sequence
      if (amount > 0) {
        // If incrementing by more than 1, try to find a valid frequency about that much higher
        const targetValue = currentValue + amount;
        newValue = this.validFrequencies[this.ASICModel].find(f => f >= targetValue) || 
                  this.validFrequencies[this.ASICModel][this.validFrequencies[this.ASICModel].length - 1];
      } else {
        // If decrementing, find a valid frequency about that much lower
        const targetValue = currentValue + amount; // amount is negative
        // Reverse search to find highest freq below target
        newValue = [...this.validFrequencies[this.ASICModel]].reverse().find(f => f <= targetValue) ||
                  this.validFrequencies[this.ASICModel][0];
      }
    } else {
      // For other controls (like voltage), use simple addition
      newValue = currentValue + amount;
      
      // Apply min/max constraints for voltage
      if (controlName === 'coreVoltage') {
        newValue = Math.min(Math.max(newValue, this.minVoltage[this.ASICModel]), this.maxVoltage[this.ASICModel]);
      }
    }
    
    control.setValue(newValue);
    control.markAsDirty();
  }

  // Color calculation methods
  getFrequencyColor(): string {
    const currentFreq = this.form?.get('frequency')?.value;
    if (!currentFreq) return 'var(--primary-color)';
    
    const defaultFreq = this.defaultFrequency[this.ASICModel];
    const maxFreq = this.maxFrequency[this.ASICModel];
    const minFreq = this.minFrequency[this.ASICModel];
    
    if (currentFreq === defaultFreq) {
      return '#22c55e'; // Green for default
    } else if (currentFreq < defaultFreq) {
      // Scale from blue (min) to green (default)
      const percentage = (currentFreq - minFreq) / (defaultFreq - minFreq);
      return this.interpolateColor('#3b82f6', '#22c55e', percentage);
    } else {
      // Scale from green (default) to red (max)
      const percentage = (currentFreq - defaultFreq) / (maxFreq - defaultFreq);
      return this.interpolateColor('#22c55e', '#ef4444', percentage);
    }
  }
  
  getVoltageColor(): string {
    const currentVoltage = this.form?.get('coreVoltage')?.value;
    if (!currentVoltage) return 'var(--primary-color)';
    
    const defaultVoltage = this.defaultVoltage[this.ASICModel];
    const maxVoltage = this.maxVoltage[this.ASICModel];
    const minVoltage = this.minVoltage[this.ASICModel];
    
    if (currentVoltage === defaultVoltage) {
      return '#22c55e'; // Green for default
    } else if (currentVoltage < defaultVoltage) {
      // Scale from blue (min) to green (default)
      const percentage = (currentVoltage - minVoltage) / (defaultVoltage - minVoltage);
      return this.interpolateColor('#3b82f6', '#22c55e', percentage);
    } else {
      // Scale from green (default) to red (max)
      const percentage = (currentVoltage - defaultVoltage) / (maxVoltage - defaultVoltage);
      return this.interpolateColor('#22c55e', '#ef4444', percentage);
    }
  }
  
  private interpolateColor(color1: string, color2: string, percentage: number): string {
    // Ensure percentage is between 0 and 1
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    
    // Convert hex to RGB
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * clampedPercentage);
    const g = Math.round(g1 + (g2 - g1) * clampedPercentage);
    const b = Math.round(b1 + (b2 - b1) * clampedPercentage);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Preset Management Methods
  
  /**
   * Create a default preset with factory values
   */
  private createDefaultPreset(): OverclockPreset {
    return {
      name: `Factory Default (${this.ASICModel})`,
      frequency: this.defaultFrequency[this.ASICModel],
      coreVoltage: this.defaultVoltage[this.ASICModel],
      timestamp: 0, // Always keep at the top by using lowest timestamp
      asicModel: this.ASICModel,
      builtIn: true
    };
  }

  /**
   * Load all saved presets from localStorage
   */
  loadPresets(): void {
    try {
      const presetsJson = localStorage.getItem('overclockPresets');
      if (presetsJson) {
        // Load user-created presets
        this.presets = JSON.parse(presetsJson);
        // Filter presets for current ASIC model
        this.presets = this.presets.filter(preset => preset.asicModel === this.ASICModel);
      } else {
        this.presets = [];
      }
      
      // Add the built-in default preset
      this.presets.unshift(this.createDefaultPreset());
      
      // Sort by most recent first, but keep built-in presets at the top
      this.presets.sort((a, b) => {
        // Keep built-in presets at the top
        if (a.builtIn && !b.builtIn) return -1;
        if (!a.builtIn && b.builtIn) return 1;
        // Otherwise sort by timestamp (most recent first)
        return b.timestamp - a.timestamp;
      });
    } catch (error) {
      console.error('Error loading presets from localStorage', error);
      this.toastr.error('Failed to load saved presets', 'Error');
      // Ensure we at least have the default preset
      this.presets = [this.createDefaultPreset()];
    }
  }
  
  /**
   * Save all presets to localStorage
   */
  savePresetsToStorage(): void {
    try {
      // Get all existing presets for all models
      let allPresets: OverclockPreset[] = [];
      const presetsJson = localStorage.getItem('overclockPresets');
      if (presetsJson) {
        allPresets = JSON.parse(presetsJson);
        // Remove presets for current model as we'll add updated ones
        allPresets = allPresets.filter(preset => preset.asicModel !== this.ASICModel);
      }
      
      // Add current model's presets, but filter out built-in presets
      const userPresets = this.presets.filter(preset => !preset.builtIn);
      allPresets = [...allPresets, ...userPresets];
      
      // Save back to localStorage
      localStorage.setItem('overclockPresets', JSON.stringify(allPresets));
    } catch (error) {
      console.error('Error saving presets to localStorage', error);
      this.toastr.error('Failed to save presets', 'Error');
    }
  }
  
  // Get the currently selected preset based on form values
  public get selectedPreset(): OverclockPreset | null {
    if (!this.form) return null;
    
    const currentFrequency = this.form.get('frequency')?.value;
    const currentVoltage = this.form.get('coreVoltage')?.value;
    
    if (!currentFrequency || !currentVoltage) return null;
    
    return this.presets.find(preset => 
      preset.frequency === currentFrequency && 
      preset.coreVoltage === currentVoltage
    ) || null;
  }
  
  // Check if current values match any existing preset
  public get hasMatchingPreset(): boolean {
    return this.selectedPreset !== null;
  }
  
  // Open dialog for editing a preset name
  public editPresetName(preset: OverclockPreset, event: Event): void {
    event.stopPropagation(); // Prevent preset from being applied
    
    if (preset.builtIn) {
      this.toastr.error(`Cannot edit built-in preset "${preset.name}"`, 'Error');
      return;
    }
    
    this.editingPreset = preset;
    this.presetName = preset.name;
    this.showPresetDialog = true;
  }
  
  /**
   * Open dialog to save the current settings as a preset
   */
  openSavePresetDialog(): void {
    this.presetName = '';
    this.editingPreset = null;
    this.showPresetDialog = true;
  }
  
  /**
   * Save current settings as a new preset or update existing
   */
  savePreset(): void {
    if (!this.presetName.trim()) {
      this.toastr.error('Please enter a name for the preset', 'Error');
      return;
    }
    
    const formValues = this.form.getRawValue();
    
    if (this.editingPreset) {
      // Editing existing preset - just update the name
      this.editingPreset.name = this.presetName.trim();
      this.toastr.success(`Preset name updated to "${this.presetName}"`, 'Success');
    } else {
      // Create new preset
      const newPreset: OverclockPreset = {
        name: this.presetName.trim(),
        frequency: formValues.frequency,
        coreVoltage: formValues.coreVoltage,
        timestamp: Date.now(),
        asicModel: this.ASICModel
      };
      
      // Check if a preset with this name already exists
      const existingIndex = this.presets.findIndex(p => p.name === newPreset.name);
      if (existingIndex >= 0) {
        // Replace existing preset
        this.presets[existingIndex] = newPreset;
      } else {
        // Add new preset
        this.presets.push(newPreset);
      }
      
      this.toastr.success(`Preset "${this.presetName}" saved successfully`, 'Success');
    }
    
    // Sort by most recent, keeping built-ins at top
    this.sortPresets();
    
    // Save to localStorage
    this.savePresetsToStorage();
    
    // Close dialog
    this.showPresetDialog = false;
    this.editingPreset = null;
  }
  
  /**
   * Sort presets with built-ins at top, then by timestamp
   */
  private sortPresets(): void {
    this.presets.sort((a, b) => {
      // Keep built-in presets at the top
      if (a.builtIn && !b.builtIn) return -1;
      if (!a.builtIn && b.builtIn) return 1;
      // Otherwise sort by timestamp (most recent first)
      return b.timestamp - a.timestamp;
    });
  }
  
  /**
   * Check if preset matches current values
   */
  public presetMatchesCurrentValues(preset: OverclockPreset): boolean {
    if (!this.form) return false;
    
    const currentFrequency = this.form.get('frequency')?.value;
    const currentVoltage = this.form.get('coreVoltage')?.value;
    
    return preset.frequency === currentFrequency && 
           preset.coreVoltage === currentVoltage;
  }

  /**
   * Acknowledge the warning message and save to localStorage
   */
  acknowledgeWarning(): void {
    this.warningAcknowledged = true;
    localStorage.setItem(this.STORAGE_KEY_WARNING, 'true');
  }

  /**
   * Apply settings from a preset
   */
  applyPreset(preset: OverclockPreset): void {
    // Update form with preset values
    this.form.patchValue({
      frequency: preset.frequency,
      coreVoltage: preset.coreVoltage
    });
    
    // Mark form as dirty to enable save button
    this.form.markAsDirty();
    
    this.toastr.info(`Applied preset "${preset.name}"`, 'Preset Applied');
  }
  
  /**
   * Delete a preset
   */
  deletePreset(preset: OverclockPreset, event: Event): void {
    // Stop the click event from propagating to parent (which would apply the preset)
    event.stopPropagation();
    
    // Skip deletion for built-in presets
    if (preset.builtIn) {
      this.toastr.error(`Cannot delete built-in preset "${preset.name}"`, 'Error');
      return;
    }
    
    // Remove the preset
    this.presets = this.presets.filter(p => p.name !== preset.name);
    
    // Save updated presets to localStorage
    this.savePresetsToStorage();
    
    this.toastr.success(`Deleted preset "${preset.name}"`, 'Success');
  }
  
  /**
   * Close the preset dialog without saving
   */
  cancelSavePreset(): void {
    this.showPresetDialog = false;
    this.editingPreset = null;
  }

  /**
   * Determine if the actual frequency indicator should be shown
   * Handles floating point precision issues in comparison
   */
  shouldShowFrequencyIndicator(): boolean {
    const inputFreq = this.form?.get('frequency')?.value;
    if (!inputFreq) {
      return false;
    }
    
    // Get the actual frequency using the getter
    const actualFreq = this.actualFrequency;
    
    // Use a small epsilon for floating point comparison
    const epsilon = 0.01;
    const diff = Math.abs(inputFreq - actualFreq);
    
    // Show indicator if difference is more than epsilon
    return diff > epsilon;
  }
}
