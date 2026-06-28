import { AIMessage } from '@langchain/core/messages';
import { AgentState } from '../state';
import { httpLocalStorage } from '../../common/services/http.service';

export async function outOfScopeNode(state: typeof AgentState.State) {
  const store = httpLocalStorage.getStore();
  const lang = store?.lang || 'en';

  let text = '';
  if (lang === 'hi') {
    text = "मैं इस अनुरोध को संसाधित करने में असमर्थ हूँ। यह या तो मेरे दायरे से बाहर है या मुझे आपका अनुरोध समझ नहीं आया। कृपया व्यवस्थापक या संबंधित सदस्य से संपर्क करें।";
  } else if (lang === 'te') {
    text = "నేను ఈ అభ్యర్థనను ప్రాసెస్ చేయలేకపోతున్నాను. ఇది నా పరిధికి వెలుపల ఉంది లేదా మీ అభ్యర్థన నాకు అర్థం కాలేదు. దయచేసి నిర్వాహకుడిని లేదా సంబంధిత సభ్యుడిని సంప్రదించండిం";
  } else if (lang === 'bn') {
    text = "আমি এই অনুরোধটি প্রক্রিয়া করতে অক্ষম। এটি আমার সুযোগের বাইরে বা আমি আপনার অনুরোধটি বুঝতে পারিনি। দয়া করে প্রশাসক বা সংশ্লিষ্ট সদস্যের সাথে যোগাযোগ করুন।";
  } else {
    text = "I am unable to process this request. It is either out of my scope or I did not understand your request. Please contact the administrator or the respective team member.";
  }

  return {
    messages: [new AIMessage(text)],
    finalResponse: text,
  };
}
