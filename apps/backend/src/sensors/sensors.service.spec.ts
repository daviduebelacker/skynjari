import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import * as yaml from 'js-yaml';

import SensorsService from './sensors.service';
import SensorType from './sensor-type.enum';
import MeasurementsArrivedEvent from '../measurements/measurements.arrived.event';

describe('SensorsService', () => {
  let service: SensorsService;

  beforeEach(async () => {
    const config = yaml.load(readFileSync(resolve(__dirname, '__fixtures__', 'sensors.yaml'), 'utf8'));
    jest.spyOn(ConfigService.prototype, 'get').mockReturnValue(config.sensors);
    const module: TestingModule = await Test.createTestingModule({
      providers: [SensorsService, ConfigService],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all sensors', async () => {
    expect((await service.findAll()).length).toEqual(3);
  });

  it('should return sensor for key', async () => {
    expect(await (await service.findByKey('power-meter')).name).toEqual('Power');
  });

  it('should update measurements on sensors', async () => {
    expect(await service.findByKey('power-meter')).toEqual({
      key: 'power-meter',
      name: 'Power',
      type: SensorType.PowerMeter,
      measurements: {
        consumption: {
          name: 'Consumption',
          unit: 'Wh',
        },
        totalizer: {
          name: 'Totalizer',
          unit: 'kWh',
        },
      },
    });
    const event = new MeasurementsArrivedEvent();
    event.sensorKey = 'power-meter';
    event.measurements = {
      consumption: 342.32,
      totalizer: 123456.78,
    };

    await service.handleMeasurementsArrivedEvent(event);

    expect(await service.findByKey('power-meter')).toEqual({
      key: 'power-meter',
      name: 'Power',
      type: SensorType.PowerMeter,
      measurements: {
        consumption: {
          name: 'Consumption',
          unit: 'Wh',
          value: 342.32,
        },
        totalizer: {
          name: 'Totalizer',
          unit: 'kWh',
          value: 123456.78,
        },
      },
    });
  });

  it('should not crash if no sensor is configured', async () => {
    jest.spyOn(ConfigService.prototype, 'get').mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [SensorsService, ConfigService],
    }).compile();

    expect(() => module.get<SensorsService>(SensorsService)).not.toThrow();
  });
});
