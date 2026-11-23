import { AppLanguage } from '../types';

export const DEFAULT_LANGUAGE: AppLanguage = 'hi';
export const LANGUAGE_STORAGE_KEY = 'infinity_app_language';

export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: AppLanguage;
  label: string;
}> = [
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

export interface TranslationBundle {
  languageName: string;
  common: {
    login: string;
    loginRequiredTitle: string;
    cancel: string;
    close: string;
    save: string;
    saving: string;
    understood: string;
    done: string;
    copied: string;
    copyLink: string;
    ok: string;
    error: string;
    success: string;
    pleaseLogin: string;
    choose: string;
    reel: string;
    post: string;
  };
  nav: {
    home: string;
    profile: string;
    createAria: string;
    addStory: string;
    uploadVideo: string;
    uploadShort: string;
    spinWinTitle: string;
    mobile: string;
    full: string;
    switchToFull: string;
    switchToMobile: string;
    tagline: string;
  };
  auth: {
    title: string;
    subtitle: string;
    phoneTab: string;
    googleTab: string;
    guestTab: string;
    referralLabel: string;
    referralPlaceholder: string;
    simPickerTitle: string;
    simChoose: string;
    mobileLabel: string;
    chooseFromSim: string;
    smsOtpLabel: string;
    autoDetectingOtp: string;
    resend: string;
    otpPlaceholder: string;
    pleaseWait: string;
    verifyAndLogin: string;
    sendOtp: string;
    detectedGoogleTitle: string;
    loginArrow: string;
    continueWithGoogle: string;
    privacyLink: string;
    invalidPhoneError: string;
    otpSentMsg: (last10: string) => string;
    otpAutoDetectedMsg: string;
    enterOtpError: string;
    otpFailedError: string;
    loginSuccessUser: (username: string) => string;
    googleSuccessMsg: (name: string) => string;
    oneTapGoogleSuccessMsg: (name: string) => string;
  };
  home: {
    accountDeletesIn: (days: number, hours: number, minutes: number) => string;
    stoppingDeletion: string;
    stopDeletion: string;
    messagesTitle: string;
    notificationsTitle: string;
    searchTitle: string;
    checkInternet: string;
    yourStory: string;
    addStoryTitle: string;
    forYou: string;
    following: string;
    trending: string;
    trendingTitle: string;
    optionsAria: string;
    noFollowedPostsTitle: string;
    noFollowedPostsDesc: string;
    discoverCreatorsBtn: string;
    noVideosTitle: string;
    noVideosDesc: string;
  };
  profile: {
    diamondsTitle: string;
    premium: string;
    premiumTitle: string;
    verifiedTitle: string;
    settingsAria: string;
    changePhotoTitle: string;
    loginSignupLink: string;
    guestBannerTitle: string;
    guestBannerDesc: string;
    loginBtn: string;
    posts: string;
    followers: string;
    followersTitle: string;
    following: string;
    followingTitle: string;
    allLikes: string;
    allLikesTitle: string;
    editProfile: string;
    shareProfile: string;
    postsTab: string;
    savedTab: string;
    highlightLabel: string;
    highlights: {
      highlight: string;
      travel: string;
      food: string;
      fitness: string;
      nature: string;
      friends: string;
    };
    noPostsInTab: string;
    editModal: {
      title: string;
      changePhoto: string;
      uploadingPhoto: string;
      nameLabel: string;
      namePlaceholder: string;
      usernameLabel: string;
      usernameHint: string;
      bioLabel: string;
      bioPlaceholder: string;
      saveBtn: string;
      savingBtn: string;
      cancelBtn: string;
      enterNameError: string;
      usernameMin3Error: string;
      usernamePatternError: string;
      usernameMax30Error: string;
      saveError: string;
    };
    shareModal: {
      title: string;
      creatorFollowers: (count: string) => string;
      inviteCode: (code: string) => string;
      shareHeading: string;
      copyLink: string;
      copied: string;
      moreApps: string;
      close: string;
      linkReadyToast: (platform: string) => string;
      linkCopiedToast: string;
      profileSharedToast: string;
      sharePromoMsg: (username: string, refCode?: string) => string;
      shareTitle: (username: string) => string;
    };
    allLikesModal: {
      title: string;
      totalLikesPill: string;
      totalSummaryLarge: (totalFormatted: string, count: number) => string;
      totalSummarySmall: (count: number) => string;
      emptyState: string;
    };
    diamondsSheet: {
      title: string;
      currentDiamonds: string;
      valueLabel: (rupees: string) => string;
      luckySpinTitle: string;
      luckySpinSub: string;
      spinNow: string;
      earnReferralTitle: string;
      perFriendBadge: string;
      earnReferralDesc: string;
      simulateInviteBtn: string;
      copyLinkBtn: string;
      copiedBtn: string;
      closeBtn: string;
    };
    milestoneModal: {
      title: string;
      blueTickTitle: string;
      completedOf: (current: number, total: number) => string;
      blueTickRule: string;
      validity31Days: string;
      blueTickDesc: string;
      vipTitle: string;
      vipRule: string;
      vipDesc: string;
      testInviteBtn: string;
      closeBtn: string;
    };
    vipStatusModal: {
      title: string;
      heading: string;
      bullet1: string;
      bullet2: string;
      bullet3: string;
      doneBtn: string;
    };
  };
  settings: {
    title: string;
    languageSectionTitle: string;
    languageSubtitle: string;
    infinityUser: string;
    switchAuth: string;
    logIn: string;
    accountPrivacy: string;
    privacyPolicy: string;
    dailyLimits: string;
    dailyLimitsSub: string;
    diamondsRules: string;
    creatorMonetization: string;
    creatorMonetizationSub: string;
    royalGoldenLook: string;
    vipBadge: string;
    goldenActiveSub: string;
    goldenLockedSub: string;
    supportFeedback: string;
    newBadge: string;
    supportFeedbackSub: string;
    cloudinaryCloud: string;
    cloudinarySub: string;
    blockedUsers: string;
    logOut: string;
    stopDeletion: string;
    closeOrDeleteAccount: string;
    scheduledBadge: string;
    cancel: string;
    subModalTitles: {
      privacyPolicy: string;
      dailyLimits: string;
      diamondsRules: string;
      cloudinarySettings: string;
      creatorMonetization: string;
      supportFeedback: string;
    };
    privacyModal: {
      heading: string;
      effective: string;
      s1Title: string;
      s1Body: string;
      s2Title: string;
      s2Body: string;
      s3Title: string;
      s3Body: string;
      s4Title: string;
      s4Body: string;
      s5Title: string;
      s5BodyBefore: string;
      s5BodyAfter: string;
    };
    limitsModal: {
      intro: string;
      followsToday: string;
      unfollowsToday: string;
      resetNote: string;
    };
    diamondsModal: {
      rule: string;
      desc: string;
      note: string;
    };
    cloudinaryModal: {
      featuresLabel: string;
      featuresPill: string;
      desc: string;
      connectionLabel: string;
      cloudNameLabel: string;
      cloudNameFallback: string;
      presetLabel: string;
      presetFallback: string;
      howToTitle: string;
      steps: [string, string, string, string, string];
      testingBtn: string;
      testBtn: string;
      verifiedMsg: string;
      uploadFailed: string;
    };
    monetizationModal: {
      policyTitle: string;
      policyText: string;
      totalViews: string;
      rawViews: string;
      verifiedViews: string;
      authenticRate: string;
      filteredViews: string;
      zeroPayout: string;
      estPayout: string;
      rateText: string;
      shieldTitle: string;
      rule1Title: string;
      rule1Desc: string;
      rule2Title: string;
      rule2Desc: string;
      rule3Title: string;
      rule3Desc: string;
      rule4Title: string;
      rule4Desc: string;
      statusLabel: string;
      statusValue: string;
    };
    feedbackModal: {
      thankYouTitle: string;
      thankYouDesc: string;
      wordLimitAlert: string;
      selectCategory: string;
      bugReport: string;
      featureIdea: string;
      feedback: string;
      yourMessage: string;
      wordsSuffix: string;
      messagePlaceholder: string;
      contactLabel: string;
      contactPlaceholder: string;
      sendingBtn: string;
      sendBtn: string;
    };
    blockedModal: {
      title: string;
      emptyState: string;
      unblockBtn: string;
      closeBtn: string;
    };
    accountClosureModal: {
      stepChoiceTitle: string;
      stepDeactivateTitle: string;
      stepDeleteDurationTitle: string;
      stepDeleteConfirmTitle: string;
      pendingDeletionNotice: string;
      stopDeletionBtn: string;
      deactivateBtn: string;
      deactivateCardDesc: string;
      deletePermanentBtn: string;
      deleteCardDesc: string;
      closeBtn: string;
      deactivateFullNotice: string;
      deactivatingBtn: string;
      deactivateFailedError: string;
      goBackBtn: string;
      chooseDaysPrompt: string;
      deleteIn7Days: string;
      deleteIn30Days: string;
      deleteTargetConfirmText: (formattedDate: string) => string;
      googleReauthNote: string;
      googleAuthError: string;
      scheduleFailedError: string;
      verifyingGoogleBtn: string;
      confirmScheduleBtn: string;
      cancelBtn: string;
    };
  };
  reelViewer: {
    backTitle: string;
    headerTitle: string;
    muteSound: string;
    unmuteSound: string;
    spinTitle: string;
    autoHiddenLabel: string;
    autoHiddenDesc: string;
    loginBtn: string;
    likeAction: string;
    followAction: string;
    guestActionAlert: (action: string) => string;
    guestSaveAlert: string;
    guestCommentAlert: string;
    guestMoreActionAlert: string;
    likeBtnTitle: string;
    commentBtnTitle: string;
    shareBtnTitle: string;
    saveBtnTitle: string;
    moreBtnTitle: string;
    originalAudio: string;
    followBtn: string;
    followingBtn: string;
    commentsHeader: (count: number) => string;
    safeModeration: string;
    noCommentsYet: string;
    guestCommentPrompt: string;
    blockedCommentNotice: string;
    quickLabel: string;
    listeningSpeakNow: string;
    doneBtn: string;
    commentPlaceholder: string;
    postBtn: string;
    abuseFilteredNotice: string;
    micPermissionNotice: string;
    voiceFallbackNotice: string;
    voiceAddedNotice: string;
    moreMenu: {
      editCaption: string;
      deleteReel: string;
      dislikeReel: string;
      undislikeReel: string;
      dislikedBadge: string;
      blockCreator: string;
      reportReel: string;
      reportsBadge: (count: number) => string;
      copyLink: string;
      shareTo: string;
      cancel: string;
    };
    editCaptionModal: {
      title: string;
      placeholder: string;
      emptyError: string;
      saveFailedError: string;
      savingBtn: string;
      saveBtn: string;
      cancelBtn: string;
    };
    deleteReelModal: {
      title: string;
      confirmText: string;
      deleteFailedError: string;
      deletingBtn: string;
      confirmBtn: string;
      cancelBtn: string;
    };
    blockModal: {
      title: string;
      confirmText: (username: string) => string;
      blockingBtn: string;
      confirmBtn: string;
      cancelBtn: string;
    };
    reportModal: {
      title: string;
      submittedTitle: string;
      submittedDesc: string;
      okClose: string;
      selectReasonLabel: (username: string) => string;
      reasons: string[];
      protectionNoteTitle: string;
      protectionNoteBody: string;
      cancelBtn: string;
      submitBtn: string;
    };
  };
  toasts: {
    spinWinTitle: string;
    spinWinDesc: (win: number) => string;
    referralTitle: string;
    referralDesc: (count: number, milestoneNote: string) => string;
    blueTickUnlockedNote: string;
    goldenThemeUnlockedNote: string;
    logoutTitle: string;
    logoutDesc: string;
    likeLoginTitle: string;
    likeLoginDesc: string;
    saveLoginTitle: string;
    saveLoginDesc: string;
    savedTitle: string;
    unsavedTitle: string;
    savedDesc: string;
    unsavedDesc: string;
    followLoginTitle: string;
    followLoginDesc: string;
    followTitle: string;
    unfollowTitle: string;
    followDesc: (username: string) => string;
    unfollowDesc: (username: string) => string;
    commentLoginTitle: string;
    commentLoginDesc: string;
    commentBlockedTitle: string;
    commentBlockedDesc: string;
    commentPostedTitle: string;
    commentPostedDesc: (username: string) => string;
    reportSafetyTitle: string;
    reportSafetyDesc: string;
    reportSavedTitle: string;
    reportSavedDesc: string;
    guestActiveTitle: string;
    guestActiveDesc: string;
    publishedTitle: string;
    publishedDesc: (format: string) => string;
    storyLoginDesc: string;
    captionOnlyOwnError: string;
    captionEmptyError: string;
    captionSavedTitle: string;
    captionSavedDesc: string;
    captionSaveError: string;
    reelDeletedTitle: string;
    reelDeletedDesc: string;
    reelDeleteError: string;
    deactivatedTitle: string;
    deactivatedDesc: string;
    deletionScheduledTitle: string;
    deletionScheduledDesc: (days: number) => string;
    accountSafeTitle: string;
    accountSafeDesc: string;
    blockedTitle: string;
    blockedDesc: (username: string) => string;
    blockErrorDesc: string;
    unblockedTitle: string;
    unblockedDesc: (username: string) => string;
    unblockErrorDesc: string;
    welcomeTitle: string;
    welcomeDesc: (name: string) => string;
    profileEditLoginDesc: string;
    profileUpdatedTitle: string;
    profileUpdatedDesc: string;
    profileSaveError: string;
  };
}

export const translations: Record<AppLanguage, TranslationBundle> = {
  hi: {
    languageName: 'हिंदी',
    common: {
      login: 'लॉगिन',
      loginRequiredTitle: 'लॉगिन करें',
      cancel: 'रद्द करें',
      close: 'बंद करें',
      save: 'सेव',
      saving: 'सेव हो रहा है...',
      understood: 'समझ आ गया',
      done: 'हो गया',
      copied: 'कॉपी हो गया!',
      copyLink: 'लिंक कॉपी करें',
      ok: 'ठीक है',
      error: 'गड़बड़ हो गई',
      success: 'हो गया!',
      pleaseLogin: 'लॉगिन करें',
      choose: 'चुनें',
      reel: 'रील',
      post: 'पोस्ट',
    },
    nav: {
      home: 'होम',
      profile: 'प्रोफ़ाइल',
      createAria: 'रील या पोस्ट बनाएँ',
      addStory: 'स्टोरी लगाएँ',
      uploadVideo: 'वीडियो डालें',
      uploadShort: 'अपलोड',
      spinWinTitle: 'स्पिन करें और डायमंड जीतें',
      mobile: 'मोबाइल',
      full: 'बड़ी स्क्रीन',
      switchToFull: 'बड़ी स्क्रीन पर देखें',
      switchToMobile: 'मोबाइल साइज में देखें',
      tagline: 'आपकी दुनिया, चलते-फिरते',
    },
    auth: {
      title: 'INFINITY लॉगिन',
      subtitle: 'मोबाइल नंबर, गूगल या गेस्ट चुनें',
      phoneTab: 'मोबाइल नंबर',
      googleTab: 'गूगल',
      guestTab: 'गेस्ट',
      referralLabel: 'रेफ़रल कोड (ज़रूरी नहीं)',
      referralPlaceholder: 'रेफ़रल कोड लिखें (अगर हो तो)',
      simPickerTitle: 'सिम कार्ड नंबर चुनें',
      simChoose: 'चुनें',
      mobileLabel: 'मोबाइल नंबर',
      chooseFromSim: 'सिम से चुनें',
      smsOtpLabel: 'SMS ओटीपी',
      autoDetectingOtp: '● अपने-आप पढ़ा जा रहा है...',
      resend: 'फिर भेजें',
      otpPlaceholder: '6 अंकों का OTP लिखें',
      pleaseWait: 'थोड़ा रुकें...',
      verifyAndLogin: 'जाँचें और लॉगिन करें',
      sendOtp: 'ओटीपी भेजें →',
      detectedGoogleTitle: 'फ़ोन में मौजूद Google अकाउंट:',
      loginArrow: 'लॉगिन →',
      continueWithGoogle: 'Google से आगे बढ़ें',
      privacyLink: 'प्राइवेसी नियम और सेवा की शर्तें',
      invalidPhoneError: 'कृपया 10 अंकों का सही मोबाइल नंबर लिखें।',
      otpSentMsg: (last10) => `ओटीपी भेजा गया (+91 ${last10})। अपने-आप पढ़ा जा रहा है...`,
      otpAutoDetectedMsg: '✅ SMS ओटीपी अपने-आप भर गया (OTP: 749216)!',
      enterOtpError: 'कृपया ओटीपी लिखें।',
      otpFailedError: 'ओटीपी की जाँच नहीं हो पाई। कृपया फिर कोशिश करें।',
      loginSuccessUser: (username) => `लॉगिन हो गया! स्वागत है @${username}!`,
      googleSuccessMsg: (name) => `Google से लॉगिन हो गया! स्वागत है ${name}!`,
      oneTapGoogleSuccessMsg: (name) => `Google से लॉगिन हो गया! स्वागत है ${name}!`,
    },
    home: {
      accountDeletesIn: (days, hours, minutes) =>
        `आपका खाता ${days} दिन ${hours} घंटे ${minutes} मिनट में मिट जाएगा`,
      stoppingDeletion: 'रोका जा रहा है...',
      stopDeletion: 'मिटाना रोकें',
      messagesTitle: 'मैसेज',
      notificationsTitle: 'नोटिफ़िकेशन',
      searchTitle: 'खोजें',
      checkInternet: 'इंटरनेट जाँचें',
      yourStory: 'आपकी स्टोरी',
      addStoryTitle: 'स्टोरी लगाएँ',
      forYou: 'आपके लिए',
      following: 'फ़ॉलोइंग',
      trending: 'ट्रेंडिंग',
      trendingTitle: 'ट्रेंडिंग वीडियो',
      optionsAria: 'विकल्प',
      noFollowedPostsTitle: 'जिन्हें आप फ़ॉलो करते हैं उनकी कोई पोस्ट नहीं है',
      noFollowedPostsDesc: 'उनकी नई रीलें देखने के लिए "आपके लिए" से क्रिएटर्स को फ़ॉलो करें।',
      discoverCreatorsBtn: '"आपके लिए" में क्रिएटर देखें',
      noVideosTitle: 'अभी कोई वीडियो नहीं है',
      noVideosDesc: 'नए वीडियो देखने के लिए थोड़ी देर बाद फिर देखें।',
    },
    profile: {
      diamondsTitle: 'डायमंड बैलेंस और इनाम',
      premium: 'प्रीमियम',
      premiumTitle: 'प्रीमियम VIP स्टेटस (6 इनवाइट पर)',
      verifiedTitle: 'ब्लू टिक बैच (3 इनवाइट पर)',
      settingsAria: 'सेटिंग्स',
      changePhotoTitle: 'प्रोफ़ाइल फ़ोटो बदलने के लिए टैप करें',
      loginSignupLink: '+ लॉगिन / नया खाता बनाएँ',
      guestBannerTitle: '👀 आप गेस्ट मोड में हैं',
      guestBannerDesc: 'लाइक, कमेंट, फ़ॉलो या वीडियो डालने के लिए कृपया लॉगिन करें।',
      loginBtn: 'लॉगिन',
      posts: 'पोस्ट',
      followers: 'फ़ॉलोअर्स',
      followersTitle: 'फ़ॉलोअर्स देखें',
      following: 'फ़ॉलोइंग',
      followingTitle: 'फ़ॉलोइंग देखें',
      allLikes: 'ऑल लाइक्स',
      allLikesTitle: 'ऑल लाइक्स देखें',
      editProfile: 'प्रोफ़ाइल एडिट करें',
      shareProfile: 'प्रोफ़ाइल शेयर करें',
      postsTab: 'पोस्ट',
      savedTab: 'सेव किए गए',
      highlightLabel: 'हाइलाइट',
      highlights: {
        highlight: 'हाइलाइट',
        travel: 'यात्रा',
        food: 'खाना',
        fitness: 'फ़िटनेस',
        nature: 'प्रकृति',
        friends: 'दोस्त',
      },
      noPostsInTab: 'इस हिस्से में अभी कोई पोस्ट नहीं है।',
      editModal: {
        title: 'प्रोफ़ाइल एडिट करें',
        changePhoto: 'प्रोफ़ाइल फ़ोटो बदलें',
        uploadingPhoto: 'फ़ोटो अपलोड हो रही है...',
        nameLabel: 'नाम',
        namePlaceholder: 'अपना नाम लिखें',
        usernameLabel: 'यूज़रनेम',
        usernameHint: 'सिर्फ़ छोटे अंग्रेज़ी अक्षर (a-z), अंक (0-9) और अंडरस्कोर (_), कम से कम 3 अक्षर',
        bioLabel: 'बायो',
        bioPlaceholder: 'अपने बारे में लिखें...',
        saveBtn: 'सेव',
        savingBtn: 'सेव हो रहा है...',
        cancelBtn: 'रद्द करें',
        enterNameError: 'कृपया अपना नाम लिखें।',
        usernameMin3Error: 'यूज़रनेम कम से कम 3 अक्षरों का होना चाहिए।',
        usernamePatternError: 'यूज़रनेम में सिर्फ़ छोटे अंग्रेज़ी अक्षर (a-z), अंक (0-9) और अंडरस्कोर (_) चलेंगे।',
        usernameMax30Error: 'यूज़रनेम 30 अक्षरों से ज़्यादा नहीं हो सकता।',
        saveError: 'प्रोफ़ाइल सेव करने में दिक्कत आई।',
      },
      shareModal: {
        title: 'प्रोफ़ाइल शेयर करें',
        creatorFollowers: (count) => `INFINITY क्रिएटर · ${count} फ़ॉलोअर्स`,
        inviteCode: (code) => `इनवाइट कोड: ${code}`,
        shareHeading: 'ऐप्स पर शेयर करें और लोगों को जोड़ें',
        copyLink: 'लिंक कॉपी करें',
        copied: 'कॉपी हो गया!',
        moreApps: 'अन्य ऐप्स',
        close: 'बंद करें',
        linkReadyToast: (platform) => `${platform} शेयर लिंक तैयार है और कॉपी हो गया! 🚀`,
        linkCopiedToast: 'प्रोफ़ाइल लिंक कॉपी हो गया! 📋',
        profileSharedToast: 'प्रोफ़ाइल शेयर हो गया! ✨',
        sharePromoMsg: (username, refCode) =>
          `🔥 INFINITY ऐप पर @${username} को फ़ॉलो करें! मज़ेदार शॉर्ट वीडियो, रील्स देखें और इनाम जीतें।${
            refCode ? ` मेरा रेफ़रल कोड: ${refCode}` : ''
          }`,
        shareTitle: (username) => `INFINITY पर @${username}`,
      },
      allLikesModal: {
        title: 'ऑल लाइक्स',
        totalLikesPill: 'सभी रीलों और पोस्टों के कुल लाइक',
        totalSummaryLarge: (totalFormatted, count) => `${totalFormatted} कुल लाइक · ${count} रील/पोस्ट`,
        totalSummarySmall: (count) => `${count} रील/पोस्ट`,
        emptyState: '0 लाइक, अपनी पहली रील डालें',
      },
      diamondsSheet: {
        title: 'डायमंड बैलेंस और इनाम',
        currentDiamonds: 'आपके डायमंड',
        valueLabel: (rupees) => `कीमत: ₹${rupees} (100 💎 = ₹1)`,
        luckySpinTitle: 'लकी स्पिन और जीतें',
        luckySpinSub: 'रोज़ पहिया घुमाएँ और 500 तक डायमंड जीतें',
        spinNow: 'अभी घुमाएँ →',
        earnReferralTitle: 'दोस्तों को बुलाकर डायमंड पाएँ',
        perFriendBadge: '+100 💎 / दोस्त',
        earnReferralDesc:
          'दोस्तों को Infinity पर बुलाएँ। हर दोस्त के जुड़ने पर आपको 100 डायमंड मिलेंगे और ब्लू टिक व प्रीमियम बैज के करीब पहुँचेंगे!',
        simulateInviteBtn: 'टेस्ट इनवाइट (+1 दोस्त)',
        copyLinkBtn: 'लिंक कॉपी करें',
        copiedBtn: 'कॉपी हो गया!',
        closeBtn: 'बंद करें',
      },
      milestoneModal: {
        title: 'बैज और VIP पड़ाव',
        blueTickTitle: 'ब्लू टिक बैज',
        completedOf: (current, total) => `${current} / ${total} पूरे`,
        blueTickRule: '"3 सफल मोबाइल लॉगिन पर ब्लू टिक"',
        validity31Days: '31 दिन के लिए',
        blueTickDesc:
          'आपके लिंक से 3 नए लोग लॉगिन कर लें, तो आपकी प्रोफ़ाइल पर 31 दिनों के लिए ब्लू टिक लग जाएगा।',
        vipTitle: 'रॉयल गोल्ड VIP बैज',
        vipRule: '"6 सफल लॉगिन पर प्रीमियम गोल्डन बैज"',
        vipDesc:
          '6 लोग लॉगिन कर लें, तो 31 दिनों के लिए गोल्डन क्राउन बैज और "गोल्डन लुक" थीम खुल जाएगी।',
        testInviteBtn: '+ टेस्ट लॉगिन / इनवाइट (+1)',
        closeBtn: 'बंद करें',
      },
      vipStatusModal: {
        title: 'Infinity VIP और प्रीमियम स्टेटस',
        heading: '⭐ वेरीफ़ाइड क्रिएटर और VIP मेंबर',
        bullet1: '• ब्लू टिक बैज चालू है',
        bullet2: '• रॉयल VIP क्राउन चालू है',
        bullet3: '• 100% कमाई के हिस्से के लिए योग्य',
        doneBtn: 'ठीक है',
      },
    },
    settings: {
      title: 'सेटिंग्स और प्राइवेसी',
      languageSectionTitle: 'भाषा',
      languageSubtitle: 'ऐप की भाषा चुनें',
      infinityUser: 'Infinity यूज़र',
      switchAuth: 'खाता बदलें',
      logIn: 'लॉगिन',
      accountPrivacy: 'अकाउंट प्राइवेसी',
      privacyPolicy: '🛡️ प्राइवेसी नियम और शर्तें',
      dailyLimits: '📊 रोज़ की सीमा',
      dailyLimitsSub: '200 फ़ॉलो / 100 अनफ़ॉलो',
      diamondsRules: '💎 टेस्ट डायमंड के नियम',
      creatorMonetization: '💰 क्रिएटर कमाई',
      creatorMonetizationSub: 'नकली व्यू सुरक्षा और कमाई',
      royalGoldenLook: '✨ रॉयल गोल्डन लुक',
      vipBadge: 'VIP',
      goldenActiveSub: 'गोल्डन थीम चालू/बंद स्विच',
      goldenLockedSub: '6 सफल इनवाइट पर 31 दिनों के लिए खुलेगा',
      supportFeedback: '💬 मदद और सुझाव',
      newBadge: 'नया',
      supportFeedbackSub: 'कोई गड़बड़ी बताएँ या नया सुझाव भेजें',
      cloudinaryCloud: '☁️ मीडिया क्लाउड स्टोरेज',
      cloudinarySub: 'रील्स, स्टोरी और पोस्ट स्टोरेज',
      blockedUsers: 'ब्लॉक किए गए लोग',
      logOut: '🚪 लॉग आउट',
      stopDeletion: 'मिटाना रोकें',
      closeOrDeleteAccount: 'खाता बंद या मिटाएँ',
      scheduledBadge: 'तय है',
      cancel: 'रद्द करें',
      subModalTitles: {
        privacyPolicy: '🛡️ प्राइवेसी नियम और शर्तें',
        dailyLimits: '📊 रोज़ की सुरक्षा सीमा',
        diamondsRules: '💎 टेस्ट डायमंड के नियम',
        cloudinarySettings: '☁️ मीडिया क्लाउड स्टोरेज',
        creatorMonetization: '💰 क्रिएटर कमाई और सुरक्षा',
        supportFeedback: '💬 मदद और सुझाव भेजें',
      },
      privacyModal: {
        heading: 'Infinity ऐप - प्राइवेसी नियम',
        effective: 'लागू तारीख़: नवंबर 2026',
        s1Title: '1. हम क्या जानकारी लेते हैं',
        s1Body:
          'हम सिर्फ़ लॉगिन की जानकारी (जैसे मोबाइल नंबर या Google ईमेल), प्रोफ़ाइल का नाम, फ़ोटो, बायो और आपकी डाली हुई रीलें/वीडियो सेव करते हैं।',
        s2Title: '2. कैमरा और माइक की अनुमति',
        s2Body:
          'कैमरा और माइक का इस्तेमाल तभी होता है जब आप रील, स्टोरी या प्रोफ़ाइल फ़ोटो बनाते हैं। आपकी मर्ज़ी के बिना इनका इस्तेमाल नहीं होता।',
        s3Title: '3. आपका डेटा सुरक्षित है',
        s3Body:
          'Infinity आपकी निजी जानकारी किसी को नहीं बेचता या किराए पर नहीं देता। आपका अकाउंट Firebase सुरक्षा से सुरक्षित रहता है।',
        s4Title: '4. 7-रिपोर्ट सुरक्षा नियम',
        s4Body:
          'सही माहौल बनाए रखने के लिए अगर किसी वीडियो पर 7 या ज़्यादा रिपोर्ट आती हैं, तो वह अपने-आप पब्लिक फ़ीड से छुप जाता है।',
        s5Title: '5. संपर्क करें',
        s5BodyBefore: 'किसी मदद या खाते से जुड़े सवाल के लिए लिखें: ',
        s5BodyAfter: ' या ऐप के "मदद और सुझाव" से संदेश भेजें।',
      },
      limitsModal: {
        intro: 'असली और सुरक्षित माहौल बनाए रखने के लिए रोज़ की सीमा:',
        followsToday: 'आज फ़ॉलो किए:',
        unfollowsToday: 'आज अनफ़ॉलो किए:',
        resetNote: 'यह सीमा हर 24 घंटे में फिर से शून्य हो जाती है।',
      },
      diamondsModal: {
        rule: '100 टेस्ट डायमंड = ₹1 (सिर्फ़ टेस्टिंग के लिए)',
        desc: 'टेस्ट डायमंड ऐप की एक्टिविटी, स्पिन व्हील और टिप जाँचने के लिए वर्चुअल कॉइन हैं।',
        note: 'यह टेस्ट डायमंड हैं — अभी इन्हें असली पैसों में नहीं निकाला जा सकता।',
      },
      cloudinaryModal: {
        featuresLabel: 'शामिल हिस्से:',
        featuresPill: 'रील्स · स्टोरी · पोस्ट',
        desc: 'कैप्शन, लाइक, कमेंट और प्रोफ़ाइल Firebase में रहते हैं, जबकि फ़ोटो और वीडियो Cloudinary पर सुरक्षित अपलोड होते हैं।',
        connectionLabel: 'Cloudinary जुड़ाव:',
        cloudNameLabel: 'क्लाउड नाम:',
        cloudNameFallback: 'सर्वर से जुड़ा है',
        presetLabel: 'अपलोड प्रीसेट:',
        presetFallback: 'Unsigned Preset',
        howToTitle: '⚙️ Cloudinary कैसे सेट करें:',
        steps: [
          'Cloudinary पर साइन अप या लॉगिन करें।',
          'डैशबोर्ड से अपना Cloud Name कॉपी करें।',
          'Settings ⚙️ → Upload → Upload Presets में जाएँ।',
          'Add Upload Preset दबाकर Signing Mode: Unsigned चुनें।',
          'प्रीसेट का नाम सेव करें (जैसे infinity_media)।',
        ],
        testingBtn: 'टेस्ट अपलोड चल रहा है...',
        testBtn: 'मीडिया अपलोड टेस्ट करें',
        verifiedMsg: 'अपलोड सही काम कर रहा है!',
        uploadFailed: 'अपलोड टेस्ट नहीं हो पाया',
      },
      monetizationModal: {
        policyTitle: 'रील्स कमाई नियम',
        policyText:
          '"₹1 प्रति 1000 रील्स व्यूज (जल्द आ रहा है)। केवल असली व्यूज मान्य हैं। नकली या बॉट व्यूज मिलने पर कमाई रद्द हो जाएगी।"',
        totalViews: 'कुल व्यूज',
        rawViews: '1.2M कुल व्यूज',
        verifiedViews: 'असली व्यूज (3s+)',
        authenticRate: '90% असली',
        filteredViews: 'नकली / तेज़ स्क्रॉल हटाए',
        zeroPayout: '0 कमाई जुड़ी',
        estPayout: 'अनुमानित कमाई',
        rateText: 'दर: ₹1 / 1,000 व्यूज',
        shieldTitle: 'बॉट सुरक्षा कवच',
        rule1Title: '3-सेकंड देखने का नियम:',
        rule1Desc: '3 सेकंड से कम देखने या तुरंत आगे बढ़ाने पर व्यू नहीं गिना जाएगा।',
        rule2Title: '24-घंटे नियम:',
        rule2Desc: 'एक ही फ़ोन से बार-बार लूप में देखने पर नकली व्यू हटा दिए जाएँगे।',
        rule3Title: 'लॉगिन ज़रूरी:',
        rule3Desc: 'कमाई पाने के लिए आपका पक्का लॉगिन खाता होना ज़रूरी है।',
        rule4Title: 'बॉट रोक:',
        rule4Desc: 'नकली और अपने-आप चलने वाले व्यू तुरंत रोक दिए जाते हैं।',
        statusLabel: 'स्थिति:',
        statusValue: 'सुरक्षा कवच चालू है (बीटा)',
      },
      feedbackModal: {
        thankYouTitle: 'धन्यवाद! आपका संदेश भेज दिया गया है।',
        thankYouDesc: 'Infinity टीम आपके सुझाव और रिपोर्ट को ज़रूर देखेगी।',
        wordLimitAlert: 'कृपया 300 शब्दों के अंदर लिखें।',
        selectCategory: 'विषय चुनें:',
        bugReport: '🐛 गड़बड़ी बताएँ',
        featureIdea: '✨ नया आइडिया',
        feedback: '💡 सुझाव',
        yourMessage: 'आपका संदेश',
        wordsSuffix: 'शब्द',
        messagePlaceholder: 'ऐप की कोई समस्या या अपना सुझाव सरल शब्दों में लिखें (अधिकतम 300 शब्द)...',
        contactLabel: 'ईमेल या मोबाइल नंबर (ज़रूरी नहीं)',
        contactPlaceholder: 'जैसे: yourname@gmail.com या +91...',
        sendingBtn: 'भेजा जा रहा है...',
        sendBtn: 'डेवलपर को भेजें',
      },
      blockedModal: {
        title: 'ब्लॉक किए गए लोग',
        emptyState: 'आपने अभी किसी को ब्लॉक नहीं किया है',
        unblockBtn: 'अनब्लॉक करें',
        closeBtn: 'बंद करें',
      },
      accountClosureModal: {
        stepChoiceTitle: 'खाता बंद या मिटाएँ',
        stepDeactivateTitle: 'खाता अस्थायी रूप से बंद करें',
        stepDeleteDurationTitle: 'खाता हमेशा के लिए मिटाएँ',
        stepDeleteConfirmTitle: 'खाता मिटाने की पुष्टि',
        pendingDeletionNotice: 'आपका खाता मिटने के लिए तय है। आप इसे अभी रोक सकते हैं।',
        stopDeletionBtn: 'मिटाना रोकें',
        deactivateBtn: 'खाता अस्थायी रूप से बंद करें',
        deactivateCardDesc:
          'प्रोफ़ाइल, रीलें और स्टोरी दूसरों को दिखनी बंद होंगी। दोबारा लॉगिन करते ही सब वापस चालू हो जाएगा।',
        deletePermanentBtn: 'खाता हमेशा के लिए मिटाएँ',
        deleteCardDesc:
          '7 दिन या 30 दिन चुनें। तय तारीख़ के बाद आपका पूरा खाता और डेटा हमेशा के लिए मिट जाएगा।',
        closeBtn: 'बंद करें',
        deactivateFullNotice:
          'आपकी प्रोफ़ाइल, रीलें और स्टोरी दूसरों को दिखनी बंद हो जाएँगी। जब भी आप दोबारा लॉगिन करेंगे, आपका खाता पहले जैसा चालू हो जाएगा।',
        deactivatingBtn: 'खाता बंद हो रहा है...',
        deactivateFailedError: 'खाता बंद करने में समस्या आई। कृपया फिर कोशिश करें।',
        goBackBtn: 'रोकें',
        chooseDaysPrompt: 'चुनें कि आप अपना खाता कितने दिन में हमेशा के लिए मिटाना चाहते हैं:',
        deleteIn7Days: '7 दिन में मिटाएँ',
        deleteIn30Days: '30 दिन में मिटाएँ',
        deleteTargetConfirmText: (formattedDate) =>
          `आपका खाता ${formattedDate} को हमेशा के लिए मिट जाएगा। आपकी प्रोफ़ाइल, रीलें, पोस्ट, स्टोरी और फ़ॉलोअर्स मिट जाएँगे। इस तारीख़ से पहले आप कभी भी इसे रोक सकते हैं।`,
        googleReauthNote: 'सुरक्षा के लिए आगे बढ़ने पर आपको दोबारा Google से लॉगिन करना होगा।',
        googleAuthError: 'Google लॉगिन पूरा नहीं हुआ। फिर कोशिश करें।',
        scheduleFailedError: 'खाता मिटाने का समय तय नहीं हो सका।',
        verifyingGoogleBtn: 'Google जाँच हो रही है...',
        confirmScheduleBtn: 'हाँ, मिटाने का समय तय करें',
        cancelBtn: 'रद्द करें',
      },
    },
    reelViewer: {
      backTitle: 'फ़ीड पर वापस जाएँ',
      headerTitle: 'Infinity रील्स',
      muteSound: 'आवाज़ बंद करें',
      unmuteSound: 'आवाज़ चालू करें',
      spinTitle: 'स्पिन करें और डायमंड जीतें',
      autoHiddenLabel: '⚠️ जाँच के लिए रोका गया:',
      autoHiddenDesc: '7 या ज़्यादा रिपोर्ट मिलने के कारण यह वीडियो पब्लिक फ़ीड से छुपाया गया है।',
      loginBtn: 'लॉगिन',
      likeAction: 'लाइक',
      followAction: 'फ़ॉलो',
      guestActionAlert: (action) => `रील ${action} करने के लिए कृपया पहले लॉगिन करें!`,
      guestSaveAlert: 'सेव करने के लिए लॉगिन करें',
      guestCommentAlert: 'कमेंट करने के लिए लॉगिन करें',
      guestMoreActionAlert: 'लॉगिन करें',
      likeBtnTitle: 'लाइक',
      commentBtnTitle: 'कमेंट',
      shareBtnTitle: 'शेयर',
      saveBtnTitle: 'सेव',
      moreBtnTitle: 'और विकल्प',
      originalAudio: 'ओरिजिनल ऑडियो',
      followBtn: 'फ़ॉलो करें',
      followingBtn: 'फ़ॉलोइंग',
      commentsHeader: (count) => `कमेंट्स (${count})`,
      safeModeration: 'सुरक्षित कमेंट्स',
      noCommentsYet: 'अभी कोई कमेंट नहीं है। पहला कमेंट लिखें!',
      guestCommentPrompt: 'कमेंट लिखने और देखने के लिए कृपया लॉगिन करें।',
      blockedCommentNotice: 'आप इस यूज़र पर कमेंट नहीं कर सकते',
      quickLabel: 'तेज़ लिखें:',
      listeningSpeakNow: 'सुन रहे हैं... बोलिए',
      doneBtn: 'हो गया ✓',
      commentPlaceholder: 'कमेंट लिखें या 🎙️ बोलकर टाइप करें...',
      postBtn: 'भेजें',
      abuseFilteredNotice: '🛡️ गाली या गलत शब्द हटा दिए गए',
      micPermissionNotice: '⚠️ बोलकर लिखने के लिए माइक की अनुमति दें',
      voiceFallbackNotice: '🎙️ सुझाव जोड़ दिया गया!',
      voiceAddedNotice: '🎙️ सुझाव जुड़ गया!',
      moreMenu: {
        editCaption: 'कैप्शन बदलें',
        deleteReel: 'रील मिटाएँ',
        dislikeReel: 'नापसंद करें',
        undislikeReel: 'नापसंद हटाएँ',
        dislikedBadge: 'नापसंद किया',
        blockCreator: 'ब्लॉक करें',
        reportReel: 'रिपोर्ट करें',
        reportsBadge: (count) => `${count} रिपोर्ट्स`,
        copyLink: 'लिंक कॉपी करें',
        shareTo: 'शेयर करें...',
        cancel: 'रद्द करें',
      },
      editCaptionModal: {
        title: 'कैप्शन बदलें',
        placeholder: 'नया कैप्शन लिखें...',
        emptyError: 'कैप्शन खाली नहीं हो सकता',
        saveFailedError: 'कैप्शन सेव नहीं हो सका, फिर कोशिश करें',
        savingBtn: 'सेव हो रहा है...',
        saveBtn: 'सेव',
        cancelBtn: 'रद्द करें',
      },
      deleteReelModal: {
        title: 'रील मिटाएँ',
        confirmText: 'क्या आप इस रील को हमेशा के लिए मिटाना चाहते हैं? इसके लाइक और कमेंट भी चले जाएँगे।',
        deleteFailedError: 'रील नहीं मिट सकी, फिर कोशिश करें',
        deletingBtn: 'मिटा रहे हैं...',
        confirmBtn: 'हाँ, मिटाएँ',
        cancelBtn: 'रद्द करें',
      },
      blockModal: {
        title: 'यूज़र को ब्लॉक करें',
        confirmText: (username) =>
          `क्या आप @${username} को ब्लॉक करना चाहते हैं? वह आपकी रीलें, स्टोरी और प्रोफ़ाइल नहीं देख पाएगा, और आप उसकी नहीं देख पाएँगे।`,
        blockingBtn: 'ब्लॉक हो रहा है...',
        confirmBtn: 'हाँ, ब्लॉक करें',
        cancelBtn: 'रद्द करें',
      },
      reportModal: {
        title: 'वीडियो की रिपोर्ट करें',
        submittedTitle: 'रिपोर्ट दर्ज हो गई!',
        submittedDesc:
          'आपकी रिपोर्ट भेज दी गई है। अगर इस रील पर 7 या ज़्यादा रिपोर्ट आती हैं, तो यह अपने-आप पब्लिक फ़ीड से हट जाएगी।',
        okClose: 'ठीक है',
        selectReasonLabel: (username) => `@${username} की इस रील की रिपोर्ट करने का कारण चुनें:`,
        reasons: [
          '🚫 स्पैम या गलत जानकारी',
          '🔞 अश्लील या गलत सामग्री',
          '🤬 नफ़रत फैलाने वाली बात',
          '⚠️ हिंसा या खतरनाक हरकत',
          '❌ झूठ या धोखाधड़ी',
        ],
        protectionNoteTitle: '🛡️ 7-रिपोर्ट सुरक्षा नियम:',
        protectionNoteBody: '7 रिपोर्ट होते ही वीडियो अपने-आप फ़ीड से हट जाता है ताकि सबके लिए सुरक्षित माहौल रहे।',
        cancelBtn: 'रद्द करें',
        submitBtn: 'रिपोर्ट भेजें',
      },
    },
    toasts: {
      spinWinTitle: 'स्पिन और जीत! 🎉',
      spinWinDesc: (win) => `बधाई हो! आपने 💎 ${win} टेस्ट डायमंड जीते!`,
      referralTitle: 'सफल इनवाइट!',
      referralDesc: (count, milestoneNote) =>
        `सफल रेफ़रल: ${count}। आपको 💎 +10 टेस्ट डायमंड मिले!${milestoneNote}`,
      blueTickUnlockedNote: ' 🔵 ब्लू टिक बैज खुल गया!',
      goldenThemeUnlockedNote: ' 👑 रॉयल गोल्ड VIP थीम खुल गई!',
      logoutTitle: 'लॉग आउट',
      logoutDesc: 'आप अपने खाते से बाहर आ गए हैं।',
      likeLoginTitle: 'लॉगिन करें',
      likeLoginDesc: 'लाइक करने के लिए कृपया पहले लॉगिन करें।',
      saveLoginTitle: 'लॉगिन करें',
      saveLoginDesc: 'सेव करने के लिए लॉगिन करें',
      savedTitle: 'सेव हो गया',
      unsavedTitle: 'सेव से हटाया गया',
      savedDesc: 'रील आपके खाते में सेव हो गई है।',
      unsavedDesc: 'रील सेव की सूची से हटा दी गई है।',
      followLoginTitle: 'लॉगिन करें',
      followLoginDesc: 'फ़ॉलो करने के लिए कृपया पहले लॉगिन करें।',
      followTitle: 'फ़ॉलो किया',
      unfollowTitle: 'अनफ़ॉलो किया',
      followDesc: (username) => `अब आप @${username} को फ़ॉलो करते हैं`,
      unfollowDesc: (username) => `आपने @${username} को अनफ़ॉलो कर दिया`,
      commentLoginTitle: 'लॉगिन करें',
      commentLoginDesc: 'कमेंट करने के लिए लॉगिन करें',
      commentBlockedTitle: 'कमेंट नहीं हो सकता',
      commentBlockedDesc: 'आप इस यूज़र पर कमेंट नहीं कर सकते',
      commentPostedTitle: 'कमेंट जुड़ गया',
      commentPostedDesc: (username) => `@${username} की रील पर आपका कमेंट दिख रहा है`,
      reportSafetyTitle: 'कम्युनिटी सुरक्षा 🛡️',
      reportSafetyDesc: '7+ रिपोर्ट मिलने पर यह वीडियो फ़ीड से छुपा दिया गया है।',
      reportSavedTitle: 'रिपोर्ट दर्ज',
      reportSavedDesc: 'आपकी रिपोर्ट सुरक्षित रूप से दर्ज हो गई है।',
      guestActiveTitle: 'गेस्ट मोड चालू! 👀',
      guestActiveDesc: 'आप बिना लॉगिन के रील्स देख सकते हैं। लाइक/कमेंट के लिए प्रोफ़ाइल से लॉगिन करें।',
      publishedTitle: 'डाल दिया गया! 🚀',
      publishedDesc: (format) => `आपका ${format === 'Post' ? 'पोस्ट' : 'रील'} अब सब देख सकते हैं।`,
      storyLoginDesc: 'स्टोरी लगाने के लिए कृपया पहले लॉगिन करें।',
      captionOnlyOwnError: 'आप सिर्फ़ अपनी ही रील का कैप्शन बदल सकते हैं',
      captionEmptyError: 'कैप्शन खाली नहीं हो सकता',
      captionSavedTitle: 'कैप्शन सेव हुआ ✓',
      captionSavedDesc: 'आपकी रील का नया कैप्शन सेव हो गया है।',
      captionSaveError: 'कैप्शन सेव नहीं हो सका, फिर कोशिश करें',
      reelDeletedTitle: 'रील मिटा दी गई',
      reelDeletedDesc: 'आपकी रील, लाइक और कमेंट हमेशा के लिए हटा दिए गए हैं।',
      reelDeleteError: 'रील नहीं मिट सकी, फिर कोशिश करें',
      deactivatedTitle: 'खाता अस्थायी रूप से बंद',
      deactivatedDesc: 'आपका खाता अस्थायी रूप से बंद हो गया है। दोबारा लॉगिन करते ही यह फिर चालू हो जाएगा।',
      deletionScheduledTitle: 'खाता मिटाने का समय तय',
      deletionScheduledDesc: (days) =>
        `आपका खाता ${days} दिन बाद हमेशा के लिए मिट जाएगा। इससे पहले आप कभी भी "मिटाना रोकें" दबा सकते हैं।`,
      accountSafeTitle: 'खाता सुरक्षित',
      accountSafeDesc: 'आपका खाता सुरक्षित है',
      blockedTitle: 'ब्लॉक किया गया',
      blockedDesc: (username) => `@${username} को ब्लॉक कर दिया गया है।`,
      blockErrorDesc: 'यूज़र को ब्लॉक करने में दिक्कत आई।',
      unblockedTitle: 'अनब्लॉक किया गया',
      unblockedDesc: (username) => `@${username} को अनब्लॉक कर दिया गया है।`,
      unblockErrorDesc: 'अनब्लॉक करने में दिक्कत आई।',
      welcomeTitle: 'स्वागत है!',
      welcomeDesc: (name) => `नमस्ते ${name}! आपका खाता तैयार है।`,
      profileEditLoginDesc: 'प्रोफ़ाइल एडिट करने के लिए कृपया लॉगिन करें।',
      profileUpdatedTitle: 'प्रोफ़ाइल सेव हुई',
      profileUpdatedDesc: 'आपकी प्रोफ़ाइल Firebase में सेव हो गई है।',
      profileSaveError: 'प्रोफ़ाइल सेव करने में दिक्कत आई।',
    },
  },
  en: {
    languageName: 'English',
    common: {
      login: 'Log In',
      loginRequiredTitle: 'Please Log In',
      cancel: 'Cancel',
      close: 'Close',
      save: 'Save',
      saving: 'Saving...',
      understood: 'Understood',
      done: 'Done',
      copied: 'Copied!',
      copyLink: 'Copy Link',
      ok: 'OK',
      error: 'Error',
      success: 'Success!',
      pleaseLogin: 'Please Log In',
      choose: 'Select',
      reel: 'Reel',
      post: 'Post',
    },
    nav: {
      home: 'Home',
      profile: 'Profile',
      createAria: 'Create Reel or Post',
      addStory: 'Add Story',
      uploadVideo: 'Upload Video',
      uploadShort: 'Upload',
      spinWinTitle: 'Spin to Win Diamonds',
      mobile: 'Mobile',
      full: 'Full',
      switchToFull: 'Switch to Full Width View',
      switchToMobile: 'Switch to Mobile Frame',
      tagline: 'Your world, in motion',
    },
    auth: {
      title: 'INFINITY Login',
      subtitle: 'Choose Mobile Number, Google, or Guest',
      phoneTab: 'Mobile',
      googleTab: 'Google',
      guestTab: 'Guest',
      referralLabel: 'Referral Code (Optional)',
      referralPlaceholder: 'Enter referral code (optional)',
      simPickerTitle: 'Select SIM Number',
      simChoose: 'Select',
      mobileLabel: 'Mobile Number',
      chooseFromSim: 'Pick from SIM',
      smsOtpLabel: 'SMS OTP',
      autoDetectingOtp: '● Auto-detecting...',
      resend: 'Resend',
      otpPlaceholder: 'Enter 6-digit OTP',
      pleaseWait: 'Please wait...',
      verifyAndLogin: 'Verify & Log In',
      sendOtp: 'Send OTP →',
      detectedGoogleTitle: 'Google Accounts on Device:',
      loginArrow: 'Log In →',
      continueWithGoogle: 'Continue with Google',
      privacyLink: 'Privacy Policy & Terms of Service',
      invalidPhoneError: 'Please enter a valid 10-digit mobile number.',
      otpSentMsg: (last10) => `OTP sent (+91 ${last10}). Auto-reading SMS...`,
      otpAutoDetectedMsg: '✅ SMS OTP auto-detected (OTP: 749216)!',
      enterOtpError: 'Please enter the OTP.',
      otpFailedError: 'OTP verification failed. Please try again.',
      loginSuccessUser: (username) => `Logged in! Welcome @${username}!`,
      googleSuccessMsg: (name) => `Signed in with Google! Welcome ${name}!`,
      oneTapGoogleSuccessMsg: (name) => `One-tap Google sign-in complete! Welcome ${name}!`,
    },
    home: {
      accountDeletesIn: (days, hours, minutes) =>
        `Your account will be deleted in ${days}d ${hours}h ${minutes}m`,
      stoppingDeletion: 'Stopping...',
      stopDeletion: 'Cancel Deletion',
      messagesTitle: 'Messages',
      notificationsTitle: 'Notifications',
      searchTitle: 'Search',
      checkInternet: 'Check internet',
      yourStory: 'Your Story',
      addStoryTitle: 'Add Story',
      forYou: 'For You',
      following: 'Following',
      trending: 'Trending',
      trendingTitle: 'Trending Topics',
      optionsAria: 'Options',
      noFollowedPostsTitle: 'No posts from accounts you follow yet',
      noFollowedPostsDesc:
        'Follow creators from the "For You" feed to see their latest reels here.',
      discoverCreatorsBtn: 'Discover Creators on For You',
      noVideosTitle: 'No videos available',
      noVideosDesc: 'Check back soon for new content.',
    },
    profile: {
      diamondsTitle: 'Diamonds Balance & Rewards',
      premium: 'Premium',
      premiumTitle: 'Premium VIP Status (6 Invites)',
      verifiedTitle: 'Verified Creator Badge (3 Invites)',
      settingsAria: 'Settings',
      changePhotoTitle: 'Tap to change profile photo',
      loginSignupLink: '+ Log In / Sign Up',
      guestBannerTitle: '👀 You are in Guest Mode',
      guestBannerDesc: 'Please log in to like, comment, follow, or post videos.',
      loginBtn: 'Log In',
      posts: 'Posts',
      followers: 'Followers',
      followersTitle: 'View Followers',
      following: 'Following',
      followingTitle: 'View Following',
      allLikes: 'All Likes',
      allLikesTitle: 'View All Likes',
      editProfile: 'Edit Profile',
      shareProfile: 'Share Profile',
      postsTab: 'Posts',
      savedTab: 'Saved',
      highlightLabel: 'Highlight',
      highlights: {
        highlight: 'Highlight',
        travel: 'Travel',
        food: 'Food',
        fitness: 'Fitness',
        nature: 'Nature',
        friends: 'Friends',
      },
      noPostsInTab: 'No posts found in this tab.',
      editModal: {
        title: 'Edit Profile',
        changePhoto: 'Change Profile Photo',
        uploadingPhoto: 'Uploading photo...',
        nameLabel: 'Name',
        namePlaceholder: 'Enter your name',
        usernameLabel: 'Username',
        usernameHint: 'Only lowercase letters (a-z), numbers (0-9) and underscore (_), min 3 chars',
        bioLabel: 'Bio',
        bioPlaceholder: 'Write something about yourself...',
        saveBtn: 'Save',
        savingBtn: 'Saving...',
        cancelBtn: 'Cancel',
        enterNameError: 'Please enter your name.',
        usernameMin3Error: 'Username must be at least 3 characters.',
        usernamePatternError: 'Username can only contain lowercase letters (a-z), digits (0-9), and underscore (_).',
        usernameMax30Error: 'Username cannot exceed 30 characters.',
        saveError: 'Could not save profile changes.',
      },
      shareModal: {
        title: 'Share Profile',
        creatorFollowers: (count) => `INFINITY Creator · ${count} Followers`,
        inviteCode: (code) => `Invite Code: ${code}`,
        shareHeading: 'Share across apps & grow reach',
        copyLink: 'Copy Link',
        copied: 'Copied!',
        moreApps: 'More Apps',
        close: 'Close',
        linkReadyToast: (platform) => `${platform} share link is ready and copied! 🚀`,
        linkCopiedToast: 'Profile link copied! 📋',
        profileSharedToast: 'Profile shared successfully! ✨',
        sharePromoMsg: (username, refCode) =>
          `🔥 Follow @${username} on INFINITY! Watch awesome short videos, reels & win rewards.${
            refCode ? ` My referral code: ${refCode}` : ''
          }`,
        shareTitle: (username) => `@${username} on INFINITY`,
      },
      allLikesModal: {
        title: 'All Likes',
        totalLikesPill: 'Total likes across all reels & posts',
        totalSummaryLarge: (totalFormatted, count) => `${totalFormatted} total likes · ${count} items`,
        totalSummarySmall: (count) => `${count} reels/posts`,
        emptyState: '0 likes yet, upload your first reel',
      },
      diamondsSheet: {
        title: 'Diamonds Balance & Rewards',
        currentDiamonds: 'Current Diamonds',
        valueLabel: (rupees) => `Value: ₹${rupees} (100 💎 = ₹1)`,
        luckySpinTitle: 'Lucky Spin & Win',
        luckySpinSub: 'Spin wheel to win up to 500 Diamonds daily',
        spinNow: 'SPIN NOW →',
        earnReferralTitle: 'Earn Diamonds via Referrals',
        perFriendBadge: '+100 💎 / Friend',
        earnReferralDesc:
          'Invite friends to join Infinity. Each friend signup gives you 100 Diamonds and counts towards your Blue Tick & Premium badge!',
        simulateInviteBtn: 'Simulate Invite (+1 Friend)',
        copyLinkBtn: 'Copy Link',
        copiedBtn: 'Copied!',
        closeBtn: 'Close',
      },
      milestoneModal: {
        title: 'Badge & VIP Milestones',
        blueTickTitle: 'Verified Blue Tick Badge',
        completedOf: (current, total) => `${current} / ${total} Completed`,
        blueTickRule: '"Blue Tick on 3 successful mobile logins"',
        validity31Days: '31 Days Validity',
        blueTickDesc:
          'Unlock the official Verified Blue Tick badge on your profile for 31 days once 3 new users join with your referral link.',
        vipTitle: 'Royal Gold VIP Premium Badge',
        vipRule: '"Premium Golden Badge on 6 successful logins"',
        vipDesc:
          'Complete 6 successful mobile logins to unlock the Royal Gold VIP Crown badge and Golden Look switch for 31 days.',
        testInviteBtn: '+ Test Mobile Login / Invite (+1)',
        closeBtn: 'Close',
      },
      vipStatusModal: {
        title: 'Infinity VIP & Premium Status',
        heading: '⭐ Verified Creator & VIP Member',
        bullet1: '• Verified Blue Tick Badge Active',
        bullet2: '• Royal VIP Crown Tier Enabled',
        bullet3: '• 100% Monetization Revenue Share Eligibility',
        doneBtn: 'Done',
      },
    },
    settings: {
      title: 'Settings & Privacy',
      languageSectionTitle: 'Language',
      languageSubtitle: 'Choose app language',
      infinityUser: 'Infinity User',
      switchAuth: 'Switch / Auth',
      logIn: 'Log In',
      accountPrivacy: 'Account Privacy',
      privacyPolicy: '🛡️ Privacy Policy & Terms',
      dailyLimits: '📊 Daily Limits',
      dailyLimitsSub: '200 Follows / 100 Unfollows',
      diamondsRules: '💎 Test Diamonds Rules',
      creatorMonetization: '💰 Creator Monetization',
      creatorMonetizationSub: 'Anti-Bot Shield & Earnings',
      royalGoldenLook: '✨ Royal Golden Look',
      vipBadge: 'VIP',
      goldenActiveSub: 'Golden UI theme on/off switch',
      goldenLockedSub: 'Unlocks for 31 days at 6 referrals',
      supportFeedback: '💬 Support & Feedback',
      newBadge: 'New',
      supportFeedbackSub: 'Report a bug, suggest a feature, or send feedback',
      cloudinaryCloud: '☁️ Cloudinary Media Cloud',
      cloudinarySub: 'Reels, Stories & Posts Storage',
      blockedUsers: 'Blocked Users',
      logOut: '🚪 Log Out',
      stopDeletion: 'Cancel Deletion',
      closeOrDeleteAccount: 'Deactivate or Delete Account',
      scheduledBadge: 'Scheduled',
      cancel: 'Cancel',
      subModalTitles: {
        privacyPolicy: '🛡️ Privacy Policy & Terms',
        dailyLimits: '📊 Daily Safety Limits',
        diamondsRules: '💎 Test Diamonds Rules',
        cloudinarySettings: '☁️ Cloudinary Media Cloud',
        creatorMonetization: '💰 Creator Monetization & Anti-Bot',
        supportFeedback: '💬 Send Feedback & Report',
      },
      privacyModal: {
        heading: 'Infinity Social Platform - Privacy Policy',
        effective: 'Effective Date: November 2026',
        s1Title: '1. Information We Collect',
        s1Body:
          'We collect account identifiers (such as mobile number or Google email), optional profile details (display name, avatar, bio), and short videos/reels uploaded by you.',
        s2Title: '2. Device Permissions (Camera & Audio)',
        s2Body:
          'Camera and Microphone access are used only when recording reels, stories, or updating profile photos. Media is never accessed without your action.',
        s3Title: '3. Zero Selling of Personal Data',
        s3Body:
          'Infinity does NOT sell, rent, or trade your personal data. Authentication is protected via Google Firebase Auth.',
        s4Title: '4. Community Moderation & 7-Report Rule',
        s4Body:
          'To keep content family-safe, any video receiving 7 or more community reports is automatically hidden from public discovery pending review.',
        s5Title: '5. Developer Contact',
        s5BodyBefore: 'For privacy requests or account help, contact ',
        s5BodyAfter: ' or use the in-app "Support & Feedback" tool.',
      },
      limitsModal: {
        intro: 'To prevent spam and foster genuine creator communities:',
        followsToday: 'Follows today:',
        unfollowsToday: 'Unfollows today:',
        resetNote: 'Limits reset every 24 hours.',
      },
      diamondsModal: {
        rule: '100 Test Diamonds = ₹1 (Internal testing rule only)',
        desc: 'Test Diamonds are virtual tokens used to evaluate creator engagement, wheel mechanics, and tips.',
        note: 'TEST DIAMONDS — No monetary value. They cannot be withdrawn for real money during beta testing.',
      },
      cloudinaryModal: {
        featuresLabel: 'Integrated Features:',
        featuresPill: 'Reels · Stories · Posts',
        desc: 'Captions, likes, comments, and profile data stay in Firebase. Photos & videos upload with automatic compression.',
        connectionLabel: 'Cloudinary Connection:',
        cloudNameLabel: 'Cloud Name:',
        cloudNameFallback: 'Configured via server or .env',
        presetLabel: 'Upload Preset:',
        presetFallback: 'Unsigned Preset',
        howToTitle: '⚙️ How to configure Cloudinary:',
        steps: [
          'Sign up or log in to Cloudinary Console.',
          'Copy your Cloud Name from the Dashboard.',
          'Go to Settings ⚙️ → Upload → Upload Presets.',
          'Click Add Upload Preset and choose Signing Mode: Unsigned.',
          'Save the preset name (e.g. infinity_media).',
        ],
        testingBtn: 'Running Test Upload...',
        testBtn: 'Test Upload Media Pipeline',
        verifiedMsg: 'Upload Pipeline Verified!',
        uploadFailed: 'Upload test failed',
      },
      monetizationModal: {
        policyTitle: 'Reels Monetization Policy',
        policyText:
          '"₹1 per 1000 Reels Views (Coming Soon). Only original and genuine views count. Bot or fake views will void payout."',
        totalViews: 'Total All-Time Views',
        rawViews: '1.2M raw views',
        verifiedViews: 'Verified Views (3s+)',
        authenticRate: '90% Authentic',
        filteredViews: 'Bot / Fast-Scroll Filtered',
        zeroPayout: '0 payout credited',
        estPayout: 'Est. Creator Payout',
        rateText: 'Rate: ₹1 / 1,000 Views',
        shieldTitle: 'Anti-Bot Shield Protection',
        rule1Title: '3-Second Watch Rule:',
        rule1Desc: 'Views under 3 seconds or fast scrolls are not counted.',
        rule2Title: '24-Hour Device Dedup:',
        rule2Desc: 'Repeated looping from the same device within 24 hours is filtered out.',
        rule3Title: 'Verified Creator Auth:',
        rule3Desc: 'A verified logged-in account is required to receive payouts.',
        rule4Title: 'AI Bot Neutralizer:',
        rule4Desc: 'Automated bot traffic is blocked immediately.',
        statusLabel: 'Status:',
        statusValue: 'Anti-Bot Shield Active (Beta)',
      },
      feedbackModal: {
        thankYouTitle: 'Thank you! Your message has been sent.',
        thankYouDesc: 'The Infinity support team will review your feedback soon.',
        wordLimitAlert: 'Please stay within the 300-word limit.',
        selectCategory: 'Select Category:',
        bugReport: '🐛 Bug Report',
        featureIdea: '✨ Feature Idea',
        feedback: '💡 Feedback',
        yourMessage: 'Your Message',
        wordsSuffix: 'words',
        messagePlaceholder: 'Share an issue, suggestion, or feedback clearly (max 300 words)...',
        contactLabel: 'Email or Mobile Number (Optional)',
        contactPlaceholder: 'e.g. yourname@gmail.com or +91...',
        sendingBtn: 'Sending...',
        sendBtn: 'Send to Developer',
      },
      blockedModal: {
        title: 'Blocked Users',
        emptyState: 'You have not blocked anyone yet',
        unblockBtn: 'Unblock',
        closeBtn: 'Close',
      },
      accountClosureModal: {
        stepChoiceTitle: 'Deactivate or Delete Account',
        stepDeactivateTitle: 'Temporarily Deactivate Account',
        stepDeleteDurationTitle: 'Permanently Delete Account',
        stepDeleteConfirmTitle: 'Confirm Account Deletion',
        pendingDeletionNotice: 'Your account is scheduled for deletion. You can cancel it now.',
        stopDeletionBtn: 'Cancel Deletion',
        deactivateBtn: 'Temporarily Deactivate Account',
        deactivateCardDesc:
          'Your profile, reels, and stories will be hidden from others. Everything turns back on as soon as you log in again.',
        deletePermanentBtn: 'Permanently Delete Account',
        deleteCardDesc:
          'Choose 7 or 30 days. After the chosen date, your entire account and data will be permanently deleted.',
        closeBtn: 'Close',
        deactivateFullNotice:
          'Your profile, reels, and stories will stop showing to others. Whenever you log back in, your account will be restored just as before.',
        deactivatingBtn: 'Deactivating account...',
        deactivateFailedError: 'Could not deactivate account. Please try again.',
        goBackBtn: 'Go Back',
        chooseDaysPrompt: 'Choose how many days before your account is permanently deleted:',
        deleteIn7Days: 'Delete in 7 days',
        deleteIn30Days: 'Delete in 30 days',
        deleteTargetConfirmText: (formattedDate) =>
          `Your account will be permanently deleted on ${formattedDate}. Your profile, reels, posts, stories, and followers will be removed. You can cancel this anytime before that date.`,
        googleReauthNote: 'For security, you will need to verify with Google login to proceed.',
        googleAuthError: 'Google sign-in verification did not complete. Please try again.',
        scheduleFailedError: 'Could not schedule account deletion.',
        verifyingGoogleBtn: 'Verifying Google...',
        confirmScheduleBtn: 'Yes, Schedule Deletion',
        cancelBtn: 'Cancel',
      },
    },
    reelViewer: {
      backTitle: 'Back to Feed',
      headerTitle: 'Infinity Reels',
      muteSound: 'Mute Sound',
      unmuteSound: 'Unmute Sound',
      spinTitle: 'Spin & Win Diamonds',
      autoHiddenLabel: '⚠️ Under Review:',
      autoHiddenDesc: 'This video is hidden from public discovery after receiving 7 or more reports.',
      loginBtn: 'Log In',
      likeAction: 'like',
      followAction: 'follow',
      guestActionAlert: (action) => `Please log in to ${action} reels!`,
      guestSaveAlert: 'Please log in to save reels',
      guestCommentAlert: 'Please log in to comment',
      guestMoreActionAlert: 'Please log in',
      likeBtnTitle: 'Like',
      commentBtnTitle: 'Comment',
      shareBtnTitle: 'Share',
      saveBtnTitle: 'Save',
      moreBtnTitle: 'More Options',
      originalAudio: 'Original Audio',
      followBtn: 'Follow',
      followingBtn: 'Following',
      commentsHeader: (count) => `Comments (${count})`,
      safeModeration: 'Safe Moderation',
      noCommentsYet: 'No comments yet. Be the first to comment!',
      guestCommentPrompt: 'Please log in to post a comment.',
      blockedCommentNotice: 'You cannot comment on this user',
      quickLabel: 'Quick:',
      listeningSpeakNow: 'Listening... Speak now',
      doneBtn: 'Done ✓',
      commentPlaceholder: 'Write a comment or 🎙️ speak to type...',
      postBtn: 'Post',
      abuseFilteredNotice: '🛡️ Filtered abusive language',
      micPermissionNotice: '⚠️ Microphone permission required for voice typing',
      voiceFallbackNotice: '🎙️ Voice suggestion added!',
      voiceAddedNotice: '🎙️ Voice suggestion added!',
      moreMenu: {
        editCaption: 'Edit Caption',
        deleteReel: 'Delete Reel',
        dislikeReel: 'Dislike Reel',
        undislikeReel: 'Remove Dislike',
        dislikedBadge: 'Disliked',
        blockCreator: 'Block',
        reportReel: 'Report Reel',
        reportsBadge: (count) => `${count} Reports`,
        copyLink: 'Copy link',
        shareTo: 'Share to...',
        cancel: 'Cancel',
      },
      editCaptionModal: {
        title: 'Edit Caption',
        placeholder: 'Write a new caption...',
        emptyError: 'Caption cannot be empty',
        saveFailedError: 'Could not save caption, please try again',
        savingBtn: 'Saving...',
        saveBtn: 'Save',
        cancelBtn: 'Cancel',
      },
      deleteReelModal: {
        title: 'Delete Reel',
        confirmText:
          'Are you sure you want to permanently delete this reel? Its likes and comments will also be removed.',
        deleteFailedError: 'Could not delete reel, please try again',
        deletingBtn: 'Deleting...',
        confirmBtn: 'Yes, Delete',
        cancelBtn: 'Cancel',
      },
      blockModal: {
        title: 'Block User',
        confirmText: (username) =>
          `Are you sure you want to block @${username}? They won't be able to see your reels, stories, or profile, and you won't see theirs.`,
        blockingBtn: 'Blocking...',
        confirmBtn: 'Yes, Block',
        cancelBtn: 'Cancel',
      },
      reportModal: {
        title: 'Report Video',
        submittedTitle: 'Report Submitted!',
        submittedDesc:
          'Your report has been recorded. Under Infinity safety rules, reels with 7 or more reports are automatically hidden from public discovery.',
        okClose: 'OK',
        selectReasonLabel: (username) => `Select reason for reporting @${username}:`,
        reasons: [
          '🚫 Spam or Misleading',
          '🔞 Adult or Inappropriate Content',
          '🤬 Hate Speech',
          '⚠️ Violence or Dangerous Activity',
          '❌ False Info or Scam',
        ],
        protectionNoteTitle: '🛡️ 7-Reports Auto-Protection:',
        protectionNoteBody: 'Once a reel receives 7 reports, it is automatically removed from public discovery.',
        cancelBtn: 'Cancel',
        submitBtn: 'Submit Report',
      },
    },
    toasts: {
      spinWinTitle: 'Spin To Win! 🎉',
      spinWinDesc: (win) => `Congratulations! You won 💎 ${win} Test Diamonds!`,
      referralTitle: 'Invite Successful!',
      referralDesc: (count, milestoneNote) =>
        `Successful referrals: ${count}. You earned 💎 +10 Test Diamonds!${milestoneNote}`,
      blueTickUnlockedNote: ' 🔵 Blue Tick Verified Badge Unlocked!',
      goldenThemeUnlockedNote: ' 👑 Royal Gold VIP Theme Unlocked!',
      logoutTitle: 'Logged Out',
      logoutDesc: 'You have been logged out successfully.',
      likeLoginTitle: 'Log In Required',
      likeLoginDesc: 'Please log in first to like reels.',
      saveLoginTitle: 'Log In Required',
      saveLoginDesc: 'Please log in to save reels.',
      savedTitle: 'Saved',
      unsavedTitle: 'Removed from Saved',
      savedDesc: 'Reel saved to your account.',
      unsavedDesc: 'Reel removed from your saved list.',
      followLoginTitle: 'Log In Required',
      followLoginDesc: 'Please log in first to follow creators.',
      followTitle: 'Followed',
      unfollowTitle: 'Unfollowed',
      followDesc: (username) => `You are now following @${username}`,
      unfollowDesc: (username) => `Unfollowed @${username}`,
      commentLoginTitle: 'Log In Required',
      commentLoginDesc: 'Please log in to comment.',
      commentBlockedTitle: 'Cannot Comment',
      commentBlockedDesc: 'You cannot comment on this user.',
      commentPostedTitle: 'Comment Posted',
      commentPostedDesc: (username) => `Added comment to @${username}'s reel`,
      reportSafetyTitle: 'Community Safety 🛡️',
      reportSafetyDesc: 'This video was automatically hidden after receiving 7+ reports.',
      reportSavedTitle: 'Report Submitted',
      reportSavedDesc: 'Your report has been saved securely.',
      guestActiveTitle: 'Guest Mode Active! 👀',
      guestActiveDesc: 'You can watch reels without logging in. Log in from Profile to like or comment.',
      publishedTitle: 'Published! 🚀',
      publishedDesc: (format) => `Your media has been posted as a ${format}.`,
      storyLoginDesc: 'Please log in first to post a story.',
      captionOnlyOwnError: 'You can only edit captions on your own reels',
      captionEmptyError: 'Caption cannot be empty',
      captionSavedTitle: 'Caption Saved ✓',
      captionSavedDesc: 'Your new reel caption has been saved.',
      captionSaveError: 'Could not save caption, please try again',
      reelDeletedTitle: 'Reel Deleted',
      reelDeletedDesc: 'Your reel, likes, and comments have been permanently removed.',
      reelDeleteError: 'Could not delete reel, please try again',
      deactivatedTitle: 'Account Deactivated',
      deactivatedDesc: 'Your account is temporarily deactivated. Log back in anytime to restore it.',
      deletionScheduledTitle: 'Account Deletion Scheduled',
      deletionScheduledDesc: (days) =>
        `Your account will be permanently deleted in ${days} days. You can cancel deletion anytime before then.`,
      accountSafeTitle: 'Account Safe',
      accountSafeDesc: 'Your account is safe and active.',
      blockedTitle: 'Blocked',
      blockedDesc: (username) => `@${username} has been blocked.`,
      blockErrorDesc: 'Could not block user.',
      unblockedTitle: 'Unblocked',
      unblockedDesc: (username) => `@${username} has been unblocked.`,
      unblockErrorDesc: 'Could not unblock user.',
      welcomeTitle: 'Welcome!',
      welcomeDesc: (name) => `Hello ${name}! Your account is ready.`,
      profileEditLoginDesc: 'Please log in to edit your profile.',
      profileUpdatedTitle: 'Profile Updated',
      profileUpdatedDesc: 'Your profile has been saved to Firebase.',
      profileSaveError: 'Could not save profile changes.',
    },
  },
};
