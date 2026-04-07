function handleQuizAnswer(questionData, userResponse) { 
  let score = 0; 
  let isCorrect = false; 
 
  // MONOLITHIC SWITCH — scoring + UI + storage all coupled 
  switch (questionData.type) { 
    case 'MULTIPLE_CHOICE': 
      console.log('Processing MCQ UI layout...');  // UI logic mixed in 
      if (questionData.correctAnswer === userResponse) { 
        score = questionData.points; 
        isCorrect = true; 
      } 
      break; 
 
    case 'TRUE_FALSE': 
      const formattedResponse = String(userResponse).toLowerCase(); 
      if (formattedResponse === questionData.correctAnswer) { 
        score = questionData.points; isCorrect = true; 
      } 
      break; 
 
    case 'DRAG_AND_DROP': 
      let matches = 0; 
      questionData.correctOrder.forEach((item, index) => { 
        if (userResponse[index] === item) matches++; 
      }); 
      score = (matches === questionData.correctOrder.length) 
        ? questionData.points 
        : (matches / questionData.correctOrder.length) * questionData.points; 
      isCorrect = matches === questionData.correctOrder.length; 
      break; 
 
    case 'SHORT_ANSWER': 
      const sanitizedInput = userResponse.trim().toLowerCase(); 
      if (questionData.acceptedAnswers.includes(sanitizedInput)) { 
        score = questionData.points; isCorrect = true; 
      } 
      break; 
 
    default: 
      console.error('Unknown question type: ' + questionData.type); 
      return; 
  } 
 
  // STORAGE LOGIC MIXED IN 
  localStorage.setItem('last_score', score); 
 
  // UI FEEDBACK LOGIC MIXED IN 
  document.getElementById('feedback-box').innerText = 
    isCorrect ? 'Correct! Well done.' : 'Try again.'; 
  document.getElementById('feedback-box').style.color = 
    isCorrect ? '#007600' : '#B12704'; 
 
  return { questionId: questionData.id, score, status: isCorrect ? 'completed' : 
'failed', 
           timestamp: new Date().toISOString() }; 
} 