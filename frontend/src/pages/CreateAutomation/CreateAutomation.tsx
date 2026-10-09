import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCreateAutomation } from '@/hooks/useAutomations';
import { socialApi, PostItem } from '@/services/socialApi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Zap,
  Link as LinkIcon,
  MessageSquare,
  Instagram,
  Send,
  Video,
  Layers,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

export const CreateAutomation: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const navigate = useNavigate();
  const createMutation = useCreateAutomation();

  // Fetch Connected Social Account and Posts
  const { data: accounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => socialApi.listAccounts(),
  });

  const connectedAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['account-posts', connectedAccount?.id],
    queryFn: () => (connectedAccount ? socialApi.getPosts(connectedAccount.id) : Promise.resolve([])),
    enabled: !!connectedAccount?.id,
  });

  // Form State
  const [socialAccountId, setSocialAccountId] = useState('');
  const [name, setName] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string>('post_new_shoes');
  const [externalPostId, setExternalPostId] = useState('post_new_shoes');
  const [postUrl, setPostUrl] = useState('https://www.instagram.com/reel/DEMO456/');

  // Automation Type & Trigger State
  const [automationType, setAutomationType] = useState<'comment_to_dm' | 'dm_to_reply'>('comment_to_dm');
  const [triggerMode, setTriggerMode] = useState<'keyword' | 'any'>('keyword');
  const [keyword, setKeyword] = useState('PRICE');
  const matchMode: 'contains' | 'exact' = 'contains';
  const caseSensitive = false;
  const allowRepeat = false;

  // Message State
  const [replyMode, setReplyMode] = useState<'static' | 'ai'>('static');
  const [dmMessage, setDmMessage] = useState(
    'Hi 👋 Thanks for your interest! The price is ₹999. DM us if you want to order.'
  );
  const [linkUrl, setLinkUrl] = useState('https://yourstore.com/order');
  const aiInstructions = 'Polite, helpful, confirm pricing ₹999, maximum 2 emojis.';
  const intentGateEnabled = false;
  const intentGateDescription = 'Asking for price or purchase link';

  useEffect(() => {
    if (connectedAccount) {
      setSocialAccountId(connectedAccount.id);
    }
  }, [connectedAccount]);

  // Set default post when posts load (without overwriting automation name)
  useEffect(() => {
    if (posts && posts.length > 0) {
      const defaultPost = posts.find((p) => p.external_post_id === 'post_new_shoes') || posts[0];
      if (defaultPost && !selectedPostId) {
        setSelectedPostId(defaultPost.external_post_id);
        setExternalPostId(defaultPost.external_post_id);
        setPostUrl(defaultPost.permalink || '');
      }
    }
  }, [posts, selectedPostId]);

  const handleSelectPost = (post: PostItem) => {
    setSelectedPostId(post.external_post_id);
    setExternalPostId(post.external_post_id);
    setPostUrl(post.permalink || '');
  };

  const handleSelectAllPosts = () => {
    setSelectedPostId('all');
    setExternalPostId('all');
    setPostUrl('');
  };

  const validateStep1 = () => {
    if (!socialAccountId && !connectedAccount?.id) {
      toast.error('Please connect an Instagram account first.');
      return false;
    }
    if (!name.trim()) {
      toast.error('Please name your automation.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (automationType === 'comment_to_dm' && triggerMode === 'keyword') {
      if (!keyword.trim()) {
        toast.error('Please enter a trigger keyword (e.g. PRICE).');
        return false;
      }
      if (keyword.length > 50) {
        toast.error('Keyword must be 50 characters or fewer.');
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    if (!dmMessage.trim()) {
      toast.error('Please enter your direct message text.');
      return false;
    }
    if (linkUrl.trim()) {
      let url = linkUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      if (url.startsWith('http://')) {
        toast.error('Destination URL must use HTTPS (e.g. https://yourstore.com)');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (activateImmediately: boolean = true) => {
    const targetAccountId = socialAccountId || connectedAccount?.id;
    if (!targetAccountId) {
      toast.error('Please connect an Instagram account first.');
      setStep(1);
      return;
    }
    if (!name.trim()) {
      toast.error('Please name your automation.');
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }
    if (!validateStep3()) {
      return;
    }

    let cleanLink = linkUrl.trim();
    if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      cleanLink = `https://${cleanLink}`;
    }

    const cleanKeyword = triggerMode === 'any' ? '*' : (keyword.trim().toUpperCase() || '*');
    const autoName = name.trim() || 'Instagram AutoDM';

    try {
      await createMutation.mutateAsync({
        name: autoName,
        social_account_id: targetAccountId,
        external_post_id: externalPostId || 'all',
        post_url: postUrl || undefined,
        trigger: {
          type: 'comment_keyword',
          keyword: cleanKeyword,
          match_mode: matchMode,
          case_sensitive: caseSensitive,
        },
        dm_message: dmMessage.trim(),
        link_url: cleanLink || undefined,
        allow_repeat: allowRepeat,
        reply_mode: replyMode,
        ai_instructions: replyMode === 'ai' ? aiInstructions.trim() : undefined,
        intent_gate_enabled: intentGateEnabled,
        intent_gate_description: intentGateEnabled ? intentGateDescription.trim() : undefined,
        status: activateImmediately ? 'active' : 'draft',
      });
      navigate('/dashboard');
    } catch (e: any) {
      // Mutation's onError handles the error toast
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/automations"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors border border-slate-200/80 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create AutoDM</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {step} of 3 · Configure post, trigger keyword, and outbound response
          </p>
        </div>
      </div>

      {/* Account Verification Banner */}
      {!connectedAccount && !isAccountsLoading && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Instagram Account Not Connected
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Connect your Instagram account to authorize AutoDM webhooks and fetch your posts.
              </p>
            </div>
          </div>
          <Link to="/social-accounts">
            <Button size="sm" icon={<Instagram className="w-4 h-4" />}>
              Connect Instagram
            </Button>
          </Link>
        </div>
      )}

      {/* Wizard Progress Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: 1, label: '1. Select Post', icon: Instagram },
          { num: 2, label: '2. Set Trigger', icon: Zap },
          { num: 3, label: '3. Response Message', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isComplete = step > item.num;
          const isCurrent = step === item.num;

          return (
            <div
              key={item.num}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${isCurrent
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                  : isComplete
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/50 border-slate-200 text-slate-400'
                }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isCurrent
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

      {/* ======================================================== */}
      {/* STEP 1: SELECT INSTAGRAM POST                            */}
      {/* ======================================================== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Instagram Post</CardTitle>
                <CardDescription>
                  Choose the post you want to monitor for comments, or select All Posts.
                </CardDescription>
              </div>
              {connectedAccount && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Connected:</span>
                  <Badge variant="active">@{connectedAccount.username || 'mybusiness'}</Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Automation Name
              </label>
              <input
                id="automation-name-input"
                type="text"
                placeholder="e.g. Summer Promo DM, Price Inquiry AutoDM..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Available Instagram Posts
              </label>

              {isPostsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
                  <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
                  <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Select All Posts Card */}
                  <div
                    onClick={handleSelectAllPosts}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${selectedPostId === 'all'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                          <Layers className="w-4 h-4" />
                        </span>
                        {selectedPostId === 'all' && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">All Posts & Reels</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Trigger this AutoDM on comments across all posts on your account.
                      </p>
                    </div>
                  </div>

                  {/* Individual Synced Posts */}
                  {(posts || []).map((post: PostItem) => {
                    const isSelected = selectedPostId === post.external_post_id;
                    const title = post.caption?.split(':')[0] || 'Instagram Post';

                    return (
                      <div
                        key={post.id}
                        onClick={() => handleSelectPost(post)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${isSelected
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                            : 'border-slate-200/80 hover:border-slate-300 bg-white'
                          }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {post.media_type === 'REEL' ? (
                                <Video className="w-3 h-3 text-indigo-600" />
                              ) : (
                                <Layers className="w-3 h-3 text-indigo-600" />
                              )}
                              {post.media_type}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{title}</h4>
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            "{post.caption}"
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span className="font-semibold text-slate-600">
                            {post.comments_count || 42} comments
                          </span>
                          <span>·</span>
                          <span>{post.likes_count || 512} likes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Trigger
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ======================================================== */}
      {/* STEP 2: TRIGGER CONFIGURATION                            */}
      {/* ======================================================== */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Configure Trigger</CardTitle>
            <CardDescription>
              Choose what event triggers the automation and specify keywords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Automation Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Automation Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div
                  onClick={() => setAutomationType('comment_to_dm')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${automationType === 'comment_to_dm'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-indigo-600" />
                      Comment → DM
                    </span>
                    {automationType === 'comment_to_dm' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Customer leaves a comment on your post (e.g. "PRICE") $\to$ automatically sends them a Direct Message.
                  </p>
                </div>

                <div
                  onClick={() => setAutomationType('dm_to_reply')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${automationType === 'dm_to_reply'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-indigo-600" />
                      New DM → Auto Reply
                    </span>
                    {automationType === 'dm_to_reply' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Customer sends a new direct message to your Instagram $\to$ automatically responds with your details.
                  </p>
                </div>
              </div>
            </div>

            {/* Comment Trigger Options */}
            {automationType === 'comment_to_dm' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Comment Trigger Condition
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="triggerMode"
                        checked={triggerMode === 'keyword'}
                        onChange={() => setTriggerMode('keyword')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Specific Keyword (e.g. PRICE, LINK)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="triggerMode"
                        checked={triggerMode === 'any'}
                        onChange={() => setTriggerMode('any')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Any Comment</span>
                    </label>
                  </div>
                </div>

                {triggerMode === 'keyword' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Trigger Keyword
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-indigo-600">#</span>
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                        placeholder="PRICE"
                        className="w-full pl-7 pr-3 py-2 text-sm uppercase font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Customers who comment this word (or include it in their comment) will receive your DM.
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Whole-word boundary matching</span>
                    <p className="text-[11px] text-slate-500">
                      Enforces exact word matches to avoid accidental triggers (e.g. prevents matching "link" in "blink").
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setStep(1)} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Message
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ======================================================== */}
      {/* STEP 3: DIRECT MESSAGE & RESPONSE BUILDER                */}
      {/* ======================================================== */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Message Form */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>3. Compose AutoDM Response</CardTitle>
              <CardDescription>
                Customize the direct message delivered to your follower's inbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Direct Message Text
                </label>
                <textarea
                  rows={4}
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  placeholder="Hi 👋 Thanks for your interest! The price is ₹999. DM us if you want to order."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Link or Store URL (Optional)
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://yourstore.com/order"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Response Generator Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setReplyMode('static')}
                    className={`p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${replyMode === 'static'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-slate-200 text-slate-600'
                      }`}
                  >
                    Static Template (Recommended)
                  </div>
                  <div
                    onClick={() => setReplyMode('ai')}
                    className={`p-3 rounded-xl border cursor-pointer text-xs font-bold transition-all ${replyMode === 'ai'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-slate-200 text-slate-600'
                      }`}
                  >
                    AI Personalized (Groq)
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setStep(2)} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  loading={createMutation.isPending}
                >
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  loading={createMutation.isPending}
                  icon={<Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                >
                  Activate AutoDM
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Live Mobile DM Preview */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-800 text-white max-w-sm mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block leading-none">
                      @{connectedAccount?.username || 'mybusiness'}
                    </span>
                    <span className="text-[10px] text-slate-400">Instagram Direct</span>
                  </div>
                </div>
                <Badge variant="draft" className="text-[9px]">Preview</Badge>
              </div>

              {/* Chat Simulation */}
              <div className="py-4 space-y-3 min-h-[220px] flex flex-col justify-end">
                {/* Incoming User Comment */}
                <div className="self-start max-w-[85%] bg-slate-800 text-slate-200 p-2.5 rounded-2xl rounded-tl-sm text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Customer Comment</span>
                  <p>"{triggerMode === 'any' ? 'Tell me more!' : keyword || 'PRICE'}"</p>
                </div>

                {/* Outbound AutoDM Bubble */}
                <div className="self-end max-w-[88%] bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm text-xs shadow-md space-y-1.5">
                  <p className="whitespace-pre-wrap">{dmMessage}</p>
                  {linkUrl && (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[11px] underline text-indigo-100 hover:text-white truncate"
                    >
                      {linkUrl}
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-center">
                <span className="text-[10px] text-slate-500">Delivered instantly upon comment match</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
