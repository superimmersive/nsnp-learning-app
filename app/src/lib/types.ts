export type LessonCard = {
  title: string
  paragraphs: string[]
  bullets?: string[]
  steps?: string[]
  flag?: string
  image?: string
  imageAlt?: string
}

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  answer: number
  feedback: string
}

export type ModuleTool = 'honorarium' | 'meal-estimate'

export type Module = {
  id: string
  number: number
  title: string
  summary: string
  minutes: number
  image: string
  imageAlt: string
  tool?: ModuleTool
  cards: LessonCard[]
  keyRules: string[]
  quiz: QuizQuestion[]
}

export type ChecklistItem = {
  id: string
  label: string
  hint?: string
}

export type Checklist = {
  id: string
  title: string
  summary: string
  items: ChecklistItem[]
}

export type DeadlineItem = {
  id: string
  when: string
  detail: string
}

export type DeadlineGroup = {
  id: string
  title: string
  items: DeadlineItem[]
}

export type HonorariumBand = {
  min: number
  max: number | null
  volunteers: number
  amount: number
}

export type MealUnit = 'kg' | 'tins' | 'sachets' | 'fruit'

export type MealItem = {
  id: string
  name: string
  quantity: number
  unit: MealUnit
  when: string
}

export type Content = {
  locale: string
  localesPlanned: string[]
  editorNote: string
  meta: {
    programme: string
    shortName: string
    district: string
    districtShort: string
    province: string
    audience: string
    year: string
    presenters: string[]
    documentTitle: string
  }
  ui: {
    skipToContent: string
    offline: string
    offlineNative: string
    installHint: string
    nav: {
      landmark: string
      home: string
      checklists: string
      deadlines: string
      certificate: string
    }
    home: {
      kicker: string
      title: string
      intro: string
      passedLabel: string
      continue: string
      start: string
      certificateReady: string
      modulesTitle: string
      toolsTitle: string
      toolDeadlines: string
      toolDeadlinesHint: string
      toolCalculator: string
      toolCalculatorHint: string
      toolLists: string
      toolListsHint: string
      notStarted: string
      inProgress: string
      passed: string
      minutes: string
      presenters: string
      passNote: string
    }
    module: {
      back: string
      keyRules: string
      quizTitle: string
      quizIntro: string
      checkAnswers: string
      tryAgain: string
      thisTry: string
      best: string
      passed: string
      notPassed: string
      answerAll: string
      correct: string
      notQuite: string
      passMark: string
    }
    checklists: {
      title: string
      intro: string
      done: string
      clear: string
      back: string
      none: string
    }
    deadlines: {
      title: string
      intro: string
      toCalculator: string
      toHonorarium: string
    }
    calculator: {
      title: string
      intro: string
      disclaimer: string
      breakfastLabel: string
      mainLabel: string
      schoolTypeLabel: string
      schoolTypes: string[]
      resultTitle: string
      empty: string
      official: string
      estimateTag: string
    }
    honorarium: {
      title: string
      intro: string
      small: string
      large: string
      learnersLabel: string
      volunteers: string
      paidToSchool: string
      learnersFed: string
      enter: string
      smallTooHigh: string
      none: string
      scaleNote: string
      andAbove: string
    }
    certificate: {
      title: string
      lockedTitle: string
      lockedBody: string
      remaining: string
      nameLabel: string
      schoolLabel: string
      roleLabel: string
      roles: string[]
      namePlaceholder: string
      schoolPlaceholder: string
      previewKicker: string
      previewTitle: string
      body: string
      dateLabel: string
      presentersLabel: string
      disclaimer: string
      print: string
      reset: string
      resetWarn: string
      resetYes: string
      resetNo: string
      yourName: string
      yourSchool: string
      yourRole: string
    }
    notFound: {
      title: string
      body: string
      home: string
    }
  }
  modules: Module[]
  checklists: Checklist[]
  deadlines: DeadlineGroup[]
  honorarium: {
    monthlyPerVolunteer: number
    monthlyLabel: string
    uifAmount: number
    uifLabel: string
    uifPeriod: string
    small: { label: string; bands: HonorariumBand[] }
    large: { label: string; bands: HonorariumBand[] }
  }
  mealEstimate: {
    baseLearners: number
    exampleLabel: string
    breakfast: MealItem[]
    main: MealItem[]
  }
}
