import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [],
  templateUrl: './api-test.component.html',
  styleUrl: './api-test.component.scss'
})
export class ApiTestComponent {
  message: string = '';
  response: string = 'Hello, the frontend is responding!';

  constructor(private apiService: ApiService){}


  ngOnInit(){
    this.apiService.getTestMessage().subscribe((msg) =>{
      this.message = msg; 
      
      // test if connection from frontend to backend works
    });
  }

}
