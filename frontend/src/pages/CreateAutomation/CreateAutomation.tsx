import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCreateAutomation } from '@/hooks/useAutomations';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Zap,
  Sparkles,
  Link as LinkIcon,
  MessageSquare,
  Instagram,
} from 'lucide-react';

export const CreateAutomation: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const navigate = useNavigate();
  const createMutation = useCreateAutomation();

  // Form State
  const [name, setName] = useState('');
  const [externalPostId, setExternalPostId] = useState('18012345678901234');
  const [postUrl, setPostUrl] = useState('https://www.instagram.com/p/DEMO123/');
  const [socialAccountId] = useState('11111111-1111-1111-1111-111111111111');

  // Trigger State
  const [keyword, setKeyword] = useState('');
  const [matchMode, setMatchMode] = useState<'contains' | 'exact'>('contains');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [allowRepeat, setAllowRepeat] = useState(false);

  // Message State
  const [replyMode, setReplyMode] = useState<'static' | 'ai'>('static');
  const [dmMessage, setDmMessage] = useState("Hey! Thanks for commenting. Here's the resource you requested:");
  const [linkUrl, setLinkUrl] = useState('https://example.com/guide');
  const [aiInstructions, setAiInstructions] = useState('Friendly, casual, max 2 emojis. Mention it is free.');
  const [intentGateEnabled, setIntentGateEnabled] = useState(false);
  const [intentGateDescription, setIntentGateDescription] = useState('Free guide about productivity tools');

  const validateStep1 = () => {
    if (!name.trim()) {
      toast.error('Please name your automation.');
      return false;
    }
    if (!externalPostId.trim()) {
      toast.error('Please specify an Instagram Post ID.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!keyword.trim()) {
      toast.error('Please enter a trigger keyword.');
      return false;
    }
    if (keyword.length > 50) {
      toast.error('Keyword must be 50 characters or fewer.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!dmMessage.trim()) {
      toast.error('Please write your direct message.');
      return false;
    }
    if (linkUrl && !linkUrl.startsWith('https://')) {
      toast.error('Destination URL must start with https://');
      return false;
    }
    return true;
  };

  const handleSubmit = async (activateImmediately: boolean = true) => {
    if (!validateStep3()) return;

    try {
      await createMutation.mutateAsync({
        name,
        social_account_id: socialAccountId,
        external_post_id: externalPostId,
        post_url: postUrl || undefined,
        trigger: {
          type: 'comment_keyword',
          keyword: keyword.trim(),
          match_mode: matchMode,
          case_sensitive: caseSensitive,
        },
        dm_message: dmMessage.trim(),
        link_url: linkUrl.trim() || undefined,
        allow_repeat: allowRepeat,
        reply_mode: replyMode,
        ai_instructions: replyMode === 'ai' ? aiInstructions.trim() : undefined,
        intent_gate_enabled: intentGateEnabled,
        intent_gate_description: intentGateEnabled ? intentGateDescription.trim() : undefined,
        status: activateImmediately ? 'active' : 'draft',
      });
      navigate('/automations');
    } catch (e) {
      // Handled in mutation hook toast
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/automations"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors border border-slate-200/80 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">New Automation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Step {step} of 3</p>
        </div>
      </div>

      {/* Wizard Progress Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: 1, label: 'Choose Post', icon: Instagram },
          { num: 2, label: 'Trigger Keyword', icon: Zap },
          { num: 3, label: 'Direct Message', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isComplete = step > item.num;
          const isCurrent = step === item.num;

          return (
            <div
              key={item.num}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                isCurrent
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                  : isComplete
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-white/50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isCurrent
                    ? 'bg-indigo-600 text-white'
                    : isComplete
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Choose Post */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Choose Instagram Post</CardTitle>
            <CardDescription>Select or paste the post you want AutoDM to watch for comments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Automation Name
              </label>
              <input
                type="text"
                placeholder="e.g. Free Notion Template Delivery"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Instagram Post URL or Media ID
              </label>
              <input
                type="text"
                placeholder="https://www.instagram.com/p/DEMO123/"
                value={postUrl}
                onChange={(e) => {
                  setPostUrl(e.target.value);
                  setExternalPostId(e.target.value.split('/p/')[1]?.replace('/', '') || '18012345678901234');
                }}
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Connected mock Instagram account: <span className="font-mono text-slate-700 font-semibold">@maya.creates</span>
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <div className="ml-auto">
              <Button
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Next: Trigger Keyword
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Trigger Keyword */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Set Keyword Trigger</CardTitle>
            <CardDescription>Specify the word or phrase followers must comment to receive your DM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Trigger Keyword
              </label>
              <div className="mt-1.5 relative">
                <input
                  type="text"
                  placeholder="e.g. LINK or GUIDE or BOOK"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold uppercase border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Followers who comment this keyword will trigger the automated DM flow.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Matching Rules
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMatchMode('contains')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    matchMode === 'contains'
                      ? 'bg-indigo-50/70 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Contains (Recommended)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Matches keyword anywhere inside a sentence as a whole word.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchMode('exact')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    matchMode === 'exact'
                      ? 'bg-indigo-50/70 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Exact Match</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Comment must only contain the keyword and optional punctuation.
                  </p>
                </button>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Require case-sensitive match (e.g. LINK only, ignore link)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRepeat}
                    onChange={(e) => setAllowRepeat(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Allow repeat DMs (send again if same follower comments later)
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Configure Message
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Configure Direct Message */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Configure Direct Message</CardTitle>
            <CardDescription>Craft the automated response and destination link sent to commenters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode switch: Static vs AI */}
            <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 gap-1 text-center font-semibold text-xs">
              <button
                type="button"
                onClick={() => setReplyMode('static')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  replyMode === 'static'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fixed Message (Standard)
              </button>
              <button
                type="button"
                onClick={() => setReplyMode('ai')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  replyMode === 'ai'
                    ? 'bg-white text-indigo-600 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                AI-Personalized Reply
              </button>
            </div>

            {/* Base DM text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {replyMode === 'ai' ? 'Base Message Template' : 'Direct Message Text'}
              </label>
              <textarea
                rows={3}
                value={dmMessage}
                onChange={(e) => setDmMessage(e.target.value)}
                placeholder="Hey! Thanks for commenting. Here's your link:"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Destination Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Destination URL (Secure https://)
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/guide"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* AI Specific settings */}
            {replyMode === 'ai' && (
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Personalization & Guardrails</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Tone & Persona Instructions (≤ 500 chars)
                  </label>
                  <input
                    type="text"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    placeholder="Friendly, casual, max 2 emojis. Mention it's free."
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="pt-2 border-t border-indigo-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={intentGateEnabled}
                      onChange={(e) => setIntentGateEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Enable AI Intent Gate (Reject spam/unrelated comments)
                    </span>
                  </label>

                  {intentGateEnabled && (
                    <input
                      type="text"
                      value={intentGateDescription}
                      onChange={(e) => setIntentGateDescription(e.target.value)}
                      placeholder="Brief offer description for the classifier"
                      className="mt-2 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  )}
                </div>

                <p className="text-[11px] text-indigo-700/80">
                  🛡️ <strong>Safety Guarantee:</strong> Guardrails ensure only your configured link is ever included. Any AI failure automatically falls back to your static message.
                </p>
              </div>
            )}

            {/* Live Message Preview */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Live Instagram DM Preview
              </label>
              <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 max-w-sm">
                <div className="bg-indigo-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed space-y-2 shadow-sm">
                  <p>{dmMessage || '...'}</p>
                  {linkUrl && (
                    <p className="font-semibold underline underline-offset-2 break-all text-indigo-100">
                      {linkUrl}
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 px-1">
                  <span>Delivered via AutoDM</span>
                  <span>Just now</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                loading={createMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                loading={createMutation.isPending}
                icon={<Zap className="w-4 h-4" />}
              >
                Activate Automation
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
