// Function that gets called in a interval to show current time
function set_new_time($time) {
  $time.innerHTML = 'Current time: ' + moment().format('H:mm:ss');
}

// Helper method to return json from a response
function responseToJson(response) {
  return response.json();
}

// Helper method to get the answers from our backend
function get_answers() {
  return new Promise(function(resolve) {
    fetch('/answers').then(responseToJson).then(resolve);
  });
}

// Helper method to create the text containing all the results
function create_list_of_answers(answers) {
    var list = '';
    if(answers.length > 0) {
      list = "Answers since you started the server: <br/>"
    }
    for(var i = 0; i < answers.length; i++) {
        // Take the answer of our first question from the form answers
        var said_yes = answers[i].answers[0].value;
        // Take the time and name as well
        var time = answers[i].time;
        var name = answers[i].name;
        var answer = null;
        if(said_yes) {
          answer = 'yes';
        } else {
          answer = 'no';
        }
        // Concatenate together the lines we want to show
        list = list + time + ' - You said ' + answer + ' when we asked if your name was "' + name + '"<br/>'
    }
    // If list is a empty string, we don't have any answers yet
    if(list === '') {
      list = 'When you answered your form, the results will show up here...'
    }
    return list;
}

// Helper method to render the answers
function render_answers(answers, $answers) {
  $answers.innerHTML = create_list_of_answers(answers);
}

// Helper method to get the form render link from a form
function get_render_link_from_form(form) {
  var to_return = null;
  // We need to iterate through all the links of the form
  form._links.forEach(function(link) {
    // If the rel property is "form_render", we found the right link to show
    // the form
    if(link.rel === 'form_render') {
      to_return = link.href;
    }
  });
  return to_return;
}

// Helper method to create a form based on a name
function create_form_with_name(name) {
  return new Promise(function(resolve) {
    // The body in the request, set the name
    var body = {
      name: name
    };
    // Options for the request
    var fetch_options = {
      // We're creating a form, hence a POST request
      method: 'POST',
      headers: {
        // Set the content-type to make sure our backend understands that
        // we're sending JSON
        'Content-Type': 'application/json'
      },
      // Set the body
      body: JSON.stringify(body)
    };
    // Make the actual request to the /create_form endpoint
    fetch('/create_form', fetch_options).then(responseToJson).then(resolve);
  })
}

// Helper method to show a form
function show_form(form, $render_area) {
  // Change the src property of the iframe where we want to see the form
  $render_area.src = get_render_link_from_form(form);
}

// Function that gets called when the dom is ready for us
function start_app() {
  $input_name = document.getElementById('name');
  $create_form_button = document.getElementById('create_form');
  $form_iframe = document.getElementById('form');
  $answers = document.getElementById('answers');
  $time = document.getElementById('time');
  $loading_indicator = document.getElementById('loading_indicator');

  // When user clicks on the create form button
  $create_form_button.addEventListener('click', function(ev) {
    ev.preventDefault();
    var name = $input_name.value;
    if(name === '') {
      alert('Name cannot be empty!');
    } else {
      form_loading($loading_indicator);
      // If we got a name, create the form
      create_form_with_name(name).then(function(form) {
        // And then show it in the panel to the right
        show_form(form, $form_iframe);
        form_stop_loading($loading_indicator);
      });
    }
  });

  setInterval(function() {
    // Every second, update the clock
    set_new_time($time);
    // And try to get the answers from our backend
    get_answers().then(function(answers) {
      // And render them in the bottom left panel
      render_answers(answers, $answers);
    });
  }, 1000);
}

function form_loading($indicator) {
  $indicator.className = "";
}
function form_stop_loading($indicator) {
  $indicator.className = "hide";
}

// When we're ready, start the app
document.addEventListener('DOMContentLoaded', start_app);
