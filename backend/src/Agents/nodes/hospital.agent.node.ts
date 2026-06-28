import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { HospitalState } from '../states/hospital.state';
import { llmInstance } from '../../google/vertex.config';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { appInstance } from '../../main';
import {
  HOSPITAL_SEARCH_PROMPT,
  HOSPITAL_BEDS_PROMPT,
  HOSPITAL_INCHARGE_PROMPT,
  HOSPITAL_PATIENTS_PROMPT,
  HOSPITAL_STAFF_PROMPT,
  HOSPITAL_SPECIALISTS_PROMPT,
} from '../prompts/hospital.prompt';
import {
  fetchHospitalByName,
  fetchBedsAvailability,
  fetchMedicalInchargeDetails,
  fetchPatientsDetails,
  fetchStaffDetails,
  fetchAvailableSpecialists,
} from '../tools/hospital.tools';
import { createAgent } from 'langchain';

export function createHospitalTools(): HospitalTools {
  if (!appInstance) {
    throw new Error('NestJS application instance is not initialized');
  }
  return new HospitalTools(appInstance.get(HospitalsService));
}

export class HospitalTools {
  constructor(private readonly hospitalsService: HospitalsService) { }

  private async llmClassify(
    messages: any[],
    options: string[],
    systemInstruction: string,
  ): Promise<string> {
    const contextMessages = messages.slice(-5);
    const response = await llmInstance.invoke(
      [
        new SystemMessage(systemInstruction),
        ...contextMessages,
      ],
      {
        tags: ['classification'],
        metadata: { is_classification: true },
      },
    );
    const raw = (response.content as string)
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)[0];
    const matched = options.find(opt => opt.toLowerCase() === raw);
    return matched ? matched : options[options.length - 1];
  }

  clasifyHospitalIntent = async (state: typeof HospitalState.State) => {
    console.log('Classify Hospital Intent', state.query);
    const intent = await this.llmClassify(
      state.messages,
      [
        'fetchHospitals',
        'bedsAvailability',
        'medicalInchargeDetails',
        'patientsDetails',
        'staffDetails',
        'availableSpecialists',
      ],
      `You are a hospitals query classifier for a hospital management system.
Classify the doctor's request into exactly one of these options:
- fetchHospitals → admin or hospital admin want to know the hospitals and their details (like name, address, active status).
- bedsAvailability → hospital admin or main admin want to check bed availability (total and available beds) under a single hospital or all hospitals.
- medicalInchargeDetails → hospital admin or main admin want to know the medical officer/incharge details (officer name, contact) of a particular hospital.
- patientsDetails → hospital admin or main admin want to know the active patients details/list from a particular hospital.
- staffDetails → hospital admin or main admin want to know the active staff details/list from a particular hospital.
- availableSpecialists → hospital admin or main admin want to check lists of available specialists (like surgeon, pediatrician, gynecologist, etc.) in a hospital.

Reply with ONE option only — one of: fetchHospitals, bedsAvailability, medicalInchargeDetails, patientsDetails, staffDetails, availableSpecialists`,
    );

    return { intent };
  };

  fetchHospitals = async (state: typeof HospitalState.State) => {
    console.log('Fetch Hospitals', state.query);
    const agent = createAgent({
      model: llmInstance,
      tools: [fetchHospitalByName],
      systemPrompt: HOSPITAL_SEARCH_PROMPT,
    });
    const response = await agent.invoke({ messages: state.messages });
    console.log('Fetch Hospitals Response', response);
    const text =
      typeof response.messages[response.messages.length - 1]?.content === 'string'
        ? response.messages[response.messages.length - 1]?.content
        : JSON.stringify(response.messages[response.messages.length - 1]?.content);
    return {
      finalResponse: text,
      messages: [response.messages[response.messages.length - 1]!],
    };
  };

  bedsAvailability = async (state: typeof HospitalState.State) => {
    console.log('Beds Availability', state.query);
    const agent = createAgent({
      model: llmInstance,
      tools: [fetchBedsAvailability],
      systemPrompt: HOSPITAL_BEDS_PROMPT,
    });
    const response = await agent.invoke({ messages: state.messages });
    console.log('Beds Availability Response', response);
    const text =
      typeof response.messages[response.messages.length - 1]?.content === 'string'
        ? response.messages[response.messages.length - 1]?.content
        : JSON.stringify(response.messages[response.messages.length - 1]?.content);
    return {
      finalResponse: text,
      messages: [response.messages[response.messages.length - 1]!],
    };
  };

  medicalInchargeDetails = async (state: typeof HospitalState.State) => {
    console.log('Medical Incharge Details', state.query);
    const agent = createAgent({
      model: llmInstance,
      tools: [fetchMedicalInchargeDetails],
      systemPrompt: HOSPITAL_INCHARGE_PROMPT,
    });
    const response = await agent.invoke({ messages: state.messages });
    console.log('Medical Incharge Details Response', response);
    const text =
      typeof response.messages[response.messages.length - 1]?.content === 'string'
        ? response.messages[response.messages.length - 1]?.content
        : JSON.stringify(response.messages[response.messages.length - 1]?.content);
    return {
      finalResponse: text,
      messages: [response.messages[response.messages.length - 1]!],
    };
  };

  patientsDetails = async (state: typeof HospitalState.State) => {
    console.log('Patients Details', state.query);
    const agent = createAgent({
      model: llmInstance,
      tools: [fetchPatientsDetails],
      systemPrompt: HOSPITAL_PATIENTS_PROMPT,
    });
    const response = await agent.invoke({ messages: state.messages });
    console.log('Patients Details Response', response);
    const text =
      typeof response.messages[response.messages.length - 1]?.content === 'string'
        ? response.messages[response.messages.length - 1]?.content
        : JSON.stringify(response.messages[response.messages.length - 1]?.content);
    return {
      finalResponse: text,
      messages: [response.messages[response.messages.length - 1]!],
    };
  };

  staffDetails = async (state: typeof HospitalState.State) => {
    console.log('Staff Details', state.query);
    const agent = createAgent({
      model: llmInstance,
      tools: [fetchStaffDetails],
      systemPrompt: HOSPITAL_STAFF_PROMPT,
    });
    const response = await agent.invoke({ messages: state.messages });
    console.log('Staff Details Response', response);
    const text =
      typeof response.messages[response.messages.length - 1]?.content === 'string'
        ? response.messages[response.messages.length - 1]?.content
        : JSON.stringify(response.messages[response.messages.length - 1]?.content);
    return {
      finalResponse: text,
      messages: [response.messages[response.messages.length - 1]!],
    };
  };

  availableSpecialists = async (state: typeof HospitalState.State) => {
    console.log('Available Specialists', state.query);
    const agent = createAgent({
      model: llmInstance,
      tools: [fetchAvailableSpecialists],
      systemPrompt: HOSPITAL_SPECIALISTS_PROMPT,
    });
    const response = await agent.invoke({ messages: state.messages });
    console.log('Available Specialists Response', response);
    const text =
      typeof response.messages[response.messages.length - 1]?.content === 'string'
        ? response.messages[response.messages.length - 1]?.content
        : JSON.stringify(response.messages[response.messages.length - 1]?.content);
    return {
      finalResponse: text,
      messages: [response.messages[response.messages.length - 1]!],
    };
  };
}
