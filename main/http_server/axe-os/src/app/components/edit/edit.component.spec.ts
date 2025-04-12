import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
import { LoadingService } from 'src/app/services/loading.service';
import { SystemService } from 'src/app/services/system.service';
import { eASICModel } from 'src/models/enum/eASICModel';
import { EditComponent } from './edit.component';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

describe('EditComponent', () => {
  let component: EditComponent;
  let fixture: ComponentFixture<EditComponent>;
  let systemServiceSpy: jasmine.SpyObj<SystemService>;
  let toastrServiceSpy: jasmine.SpyObj<ToastrService>;
  let loadingServiceSpy: jasmine.SpyObj<LoadingService>;
  
  // Mock localStorage
  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Mock localStorage before each test
    localStorageMock = {};
    spyOn(localStorage, 'getItem').and.callFake((key) => {
      return localStorageMock[key] || null;
    });
    spyOn(localStorage, 'setItem').and.callFake((key, value) => {
      localStorageMock[key] = value.toString();
    });
    
    const systemSpy = jasmine.createSpyObj('SystemService', ['getInfo', 'updateSystem', 'restart']);
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']);
    const loadingSpy = jasmine.createSpyObj('LoadingService', ['lockUIUntilComplete']);
    
    systemSpy.getInfo.and.returnValue(of({
      ASICModel: eASICModel.BM1370,
      overclockEnabled: 1,
      frequency: 525,
      coreVoltage: 1150,
      flipscreen: 0,
      invertscreen: 0,
      autofanspeed: 1,
      invertfanpolarity: 0,
      fanspeed: 70,
      overheat_mode: 0
    }));
    
    loadingSpy.lockUIUntilComplete.and.returnValue(() => <T>(source: Observable<T>) => source);

    TestBed.configureTestingModule({
      declarations: [EditComponent],
      imports: [ReactiveFormsModule, FormsModule],
      providers: [
        FormBuilder,
        { provide: SystemService, useValue: systemSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: LoadingService, useValue: loadingSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    });
    
    fixture = TestBed.createComponent(EditComponent);
    component = fixture.componentInstance;
    systemServiceSpy = TestBed.inject(SystemService) as jasmine.SpyObj<SystemService>;
    toastrServiceSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
    loadingServiceSpy = TestBed.inject(LoadingService) as jasmine.SpyObj<LoadingService>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  describe('increment functionality', () => {
    it('should increment frequency value by the specified amount', () => {
      // Setup initial value
      component.form.patchValue({ frequency: 500 });
      
      // Call the increment method
      component.incrementValue('frequency', 25);
      
      // Check the result
      expect(component.form.get('frequency')?.value).toBe(525);
    });
    
    it('should decrement frequency value by the specified amount', () => {
      // Setup initial value
      component.form.patchValue({ frequency: 500 });
      
      // Call the increment method with negative value
      component.incrementValue('frequency', -50);
      
      // Check the result
      expect(component.form.get('frequency')?.value).toBe(450);
    });
    
    it('should not exceed maximum frequency value', () => {
      // Setup initial value near max
      const maxValue = component.maxFrequency[component.ASICModel];
      component.form.patchValue({ frequency: maxValue - 10 });
      
      // Call the increment method with a value that would exceed max
      component.incrementValue('frequency', 50);
      
      // Check that the value is capped at max
      expect(component.form.get('frequency')?.value).toBe(maxValue);
    });
    
    it('should not go below minimum frequency value', () => {
      // Setup initial value near min
      const minValue = component.minFrequency[component.ASICModel];
      component.form.patchValue({ frequency: minValue + 10 });
      
      // Call the increment method with a value that would go below min
      component.incrementValue('frequency', -50);
      
      // Check that the value is capped at min
      expect(component.form.get('frequency')?.value).toBe(minValue);
    });
  });
  
  describe('color calculation', () => {
    it('should return green for default frequency value', () => {
      // Set frequency to default
      const defaultValue = component.defaultFrequency[component.ASICModel];
      component.form.patchValue({ frequency: defaultValue });
      
      // Check color
      expect(component.getFrequencyColor()).toBe('#22c55e');
    });
    
    it('should return a color between blue and green for values below default', () => {
      // Set frequency below default
      const defaultValue = component.defaultFrequency[component.ASICModel];
      const minValue = component.minFrequency[component.ASICModel];
      const midValue = minValue + (defaultValue - minValue) / 2;
      component.form.patchValue({ frequency: midValue });
      
      // Check that color is not blue or green but something in between
      const color = component.getFrequencyColor();
      expect(color).not.toBe('#3b82f6'); // Not pure blue
      expect(color).not.toBe('#22c55e'); // Not pure green
    });
    
    it('should return a color between green and red for values above default', () => {
      // Set frequency above default
      const defaultValue = component.defaultFrequency[component.ASICModel];
      const maxValue = component.maxFrequency[component.ASICModel];
      const midValue = defaultValue + (maxValue - defaultValue) / 2;
      component.form.patchValue({ frequency: midValue });
      
      // Check that color is not green or red but something in between
      const color = component.getFrequencyColor();
      expect(color).not.toBe('#22c55e'); // Not pure green
      expect(color).not.toBe('#ef4444'); // Not pure red
    });
  });
  
  describe('preset functionality', () => {
    it('should save a preset to localStorage', () => {
      // Set up form values
      component.form.patchValue({ 
        frequency: 600, 
        coreVoltage: 1200 
      });
      
      // Set preset name
      component.presetName = 'Test Preset';
      
      // Save preset
      component.savePreset();
      
      // Check that preset was saved
      const savedPresets = JSON.parse(localStorageMock['overclockPresets'] || '[]');
      expect(savedPresets.length).toBe(1);
      expect(savedPresets[0].name).toBe('Test Preset');
      expect(savedPresets[0].frequency).toBe(600);
      expect(savedPresets[0].coreVoltage).toBe(1200);
      expect(savedPresets[0].asicModel).toBe(component.ASICModel);
    });
    
    it('should load presets from localStorage on init', () => {
      // Setup mock localStorage with a preset
      const mockPreset = {
        name: 'Saved Preset',
        frequency: 650,
        coreVoltage: 1250,
        timestamp: Date.now(),
        asicModel: eASICModel.BM1370
      };
      
      localStorageMock['overclockPresets'] = JSON.stringify([mockPreset]);
      
      // Call loadPresets manually since we've mocked localStorage after component init
      component.loadPresets();
      
      // Check that preset was loaded
      // Should have the built-in default + our saved preset
      expect(component.presets.length).toBe(2);
      
      // First one should be built-in default
      expect(component.presets[0].builtIn).toBeTrue();
      expect(component.presets[0].name).toContain('Factory Default');
      expect(component.presets[0].name).toContain(component.ASICModel);
      
      // Second should be our custom preset
      expect(component.presets[1].name).toBe('Saved Preset');
      expect(component.presets[1].frequency).toBe(650);
    });
    
    it('should always include a built-in default preset', () => {
      // Clear any existing presets
      component.presets = [];
      
      // Load presets (should add the default)
      component.loadPresets();
      
      // Should have at least the built-in default preset
      expect(component.presets.length).toBeGreaterThanOrEqual(1);
      expect(component.presets[0].builtIn).toBeTrue();
      expect(component.presets[0].name).toContain('Factory Default');
      
      // Factory preset should have default values
      expect(component.presets[0].frequency).toBe(component.defaultFrequency[component.ASICModel]);
      expect(component.presets[0].coreVoltage).toBe(component.defaultVoltage[component.ASICModel]);
    });
    
    it('should prevent deletion of built-in presets', () => {
      // Setup with just the default preset
      component.loadPresets();
      const builtInPreset = component.presets[0];
      
      // Try to delete the built-in preset
      component.deletePreset(builtInPreset, new MouseEvent('click'));
      
      // Should still be there
      expect(component.presets.length).toBe(1);
      expect(component.presets[0].builtIn).toBeTrue();
      
      // Should have shown an error toast
      expect(toastrServiceSpy.error).toHaveBeenCalled();
    });
    
    it('should not save built-in presets to localStorage', () => {
      // Setup with a built-in and a user preset
      const userPreset = {
        name: 'User Preset',
        frequency: 650,
        coreVoltage: 1250,
        timestamp: Date.now(),
        asicModel: component.ASICModel
      };
      
      component.loadPresets(); // Adds built-in
      component.presets.push(userPreset);
      
      // Save to storage
      component.savePresetsToStorage();
      
      // Check localStorage - should only have the user preset
      const savedPresets = JSON.parse(localStorageMock['overclockPresets'] || '[]');
      expect(savedPresets.length).toBe(1);
      expect(savedPresets[0].name).toBe('User Preset');
      expect(savedPresets.some((p: any) => p.builtIn === true)).toBeFalse();
    });
    
    it('should apply preset values to the form', () => {
      // Create a test preset
      const testPreset = {
        name: 'Apply Test',
        frequency: 700,
        coreVoltage: 1300,
        timestamp: Date.now(),
        asicModel: eASICModel.BM1370
      };
      
      // Start with different values
      component.form.patchValue({
        frequency: 500,
        coreVoltage: 1100
      });
      
      // Apply the preset
      component.applyPreset(testPreset);
      
      // Check that form values were updated
      expect(component.form.get('frequency')?.value).toBe(700);
      expect(component.form.get('coreVoltage')?.value).toBe(1300);
      expect(component.form.dirty).toBeTrue();
    });
    
    it('should apply default preset values to the form', () => {
      // Start with non-default values
      component.form.patchValue({
        frequency: 800,
        coreVoltage: 1300
      });
      
      // Get the built-in default preset
      component.loadPresets();
      const defaultPreset = component.presets[0];
      
      // Apply the default preset
      component.applyPreset(defaultPreset);
      
      // Check that form values were reset to defaults
      expect(component.form.get('frequency')?.value).toBe(component.defaultFrequency[component.ASICModel]);
      expect(component.form.get('coreVoltage')?.value).toBe(component.defaultVoltage[component.ASICModel]);
    });
    
    it('should delete a preset', () => {
      // Setup presets
      const presets = [
        {
          name: 'Preset 1',
          frequency: 600,
          coreVoltage: 1200,
          timestamp: Date.now(),
          asicModel: eASICModel.BM1370
        },
        {
          name: 'Preset 2',
          frequency: 650,
          coreVoltage: 1250,
          timestamp: Date.now(),
          asicModel: eASICModel.BM1370
        }
      ];
      
      component.presets = [...presets];
      
      // Delete first preset
      component.deletePreset(presets[0], new MouseEvent('click'));
      
      // Check that preset was removed
      expect(component.presets.length).toBe(1);
      expect(component.presets[0].name).toBe('Preset 2');
      
      // localStorage should have been updated
      expect(toastrServiceSpy.success).toHaveBeenCalled();
    });
    
    it('should update an existing preset if names match', () => {
      // Setup initial preset
      const initialPreset = {
        name: 'Same Name',
        frequency: 600,
        coreVoltage: 1200,
        timestamp: Date.now() - 1000, // older timestamp
        asicModel: eASICModel.BM1370
      };
      
      component.presets = [initialPreset];
      
      // Set up new values
      component.form.patchValue({
        frequency: 650,
        coreVoltage: 1250
      });
      
      // Use same name for new preset
      component.presetName = 'Same Name';
      
      // Save preset
      component.savePreset();
      
      // Should still have only one preset
      expect(component.presets.length).toBe(1);
      
      // Values should be updated
      expect(component.presets[0].frequency).toBe(650);
      expect(component.presets[0].coreVoltage).toBe(1250);
      expect(component.presets[0].timestamp).toBeGreaterThan(initialPreset.timestamp);
    });
  });
  
  describe('warning acknowledgment', () => {
    it('should set warningAcknowledged to false initially if not in localStorage', () => {
      // Ensure localStorage is empty
      localStorage.removeItem('overclockWarningAcknowledged');
      
      // Create new component instance to trigger ngOnInit
      component = fixture.componentInstance;
      component.ngOnInit();
      
      // Check initial state
      expect(component.warningAcknowledged).toBeFalse();
    });
    
    it('should set warningAcknowledged to true if acknowledged in localStorage', () => {
      // Set localStorage to indicate warning was acknowledged
      localStorage.setItem('overclockWarningAcknowledged', 'true');
      
      // Create new component instance to trigger ngOnInit
      component = fixture.componentInstance;
      component.ngOnInit();
      
      // Check initial state
      expect(component.warningAcknowledged).toBeTrue();
    });
    
    it('should save acknowledgment to localStorage when acknowledgeWarning is called', () => {
      // Ensure localStorage is empty
      localStorage.removeItem('overclockWarningAcknowledged');
      
      // Initial state should be false
      expect(component.warningAcknowledged).toBeFalse();
      
      // Call the method
      component.acknowledgeWarning();
      
      // Check results
      expect(component.warningAcknowledged).toBeTrue();
      expect(localStorage.getItem('overclockWarningAcknowledged')).toBe('true');
    });
  });
});
