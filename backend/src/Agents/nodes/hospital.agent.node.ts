import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PatientState } from '../states/patient.state';
import { llmInstance } from '../../google/vertex.config';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { appInstance } from '../../main';
// import { tool } from 'langchain';
// import { HospitalDocument } from 'src/schemas/hospital.schema';
// import z from 'zod';
import { HOSPITAL_SEARCH_PROMPT } from '../prompts/hospital.prompt';
import { fetchHospitalByName } from '../tools/hospital.tools';
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
    query: string,
    options: string[],
    systemInstruction: string,
  ): Promise<string> {
    const response = await llmInstance.invoke([
      new SystemMessage(systemInstruction),
      new HumanMessage(query),
    ]);
    const raw = (response.content as string)
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)[0];
    return options.includes(raw) ? raw : options[options.length - 1];
  }

  clasifyHospitalIntent = async (state: typeof PatientState.State) => {
    console.log('Classify Hospital Intent', state.query);
    const intent = await this.llmClassify(
      state.query,
      [
        'fetchHospitals',
        'bedsAvailablity',
        'medicalInchargeDetails',
        'patientsDetails',
        'staffDetails',
      ],
      `You are a hospitals query classifier for a hospital management system.
Classify the doctor's request into exactly one of these options:
- fetchHospitals → admin or hospital admin want to know the hospitals and their details.
- bedsAvailablity → hospital admin or main admin want to check bed availability under a single hospital.
- medicalInchargeDetails → hospital admin or main admin want to know the medical incharge details of a particular hospital.
- patientsDetails → hospital admin or main admin want to know the patients details from a particular hospital.
- staffDetails → hospital admin or main admin want to know the staff details from a particular hospital.

Reply with ONE option only — one of: fetchHospitals, bedsAvailablity, medicalInchargeDetails, patientsDetails, staffDetails`,
    );

    return { intent };
  };

  fetchHospitals = async (state: typeof PatientState.State) => {
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
}
